-- Persist a start that would otherwise be forgotten when its member leaves.
-- Existing departures have no timezone history, so conservatively lock habits
-- whose start date has arrived anywhere in the world (UTC+14). Run this one-time
-- backfill only when the column is created, not when this migration is rerun.
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_attribute
    where attrelid = 'public.shared_habits'::regclass
      and attname = 'management_locked' and not attisdropped
  ) then
    alter table public.shared_habits
      add column management_locked boolean not null default false;
    update public.shared_habits
      set management_locked = true
    where start_date <= (clock_timestamp() at time zone 'Pacific/Kiritimati')::date;
  end if;
end;
$$;
-- Column UPDATE is not granted to authenticated users; only the trigger below
-- sets it after creation.
revoke update (management_locked) on public.shared_habits from public, anon, authenticated;

-- The membership deletion RPC and account deletion already lock habit rows
-- before removing membership. Cascaded deletion of an entire habit sees no
-- parent row and therefore does not resurrect or update the deleted habit.
create or replace function public.remember_shared_habit_start()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.shared_habits h
    set management_locked = true
  where h.id = old.shared_habit_id
    and not h.management_locked
    and (clock_timestamp() at time zone old.timezone)::date >= h.start_date;
  return old;
end;
$$;
revoke execute on function public.remember_shared_habit_start() from public, anon, authenticated;
drop trigger if exists remember_shared_habit_start on public.shared_habit_members;
create trigger remember_shared_habit_start
  before delete on public.shared_habit_members
  for each row execute function public.remember_shared_habit_start();

-- All edit, invite and membership changes serialize on the habit row.
-- An UPDATE already holds that row lock before its BEFORE triggers run.
drop trigger if exists lock_started_shared_habit on public.shared_habits;

create or replace function public.guard_shared_habit_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_latest_today date;
  v_member_count integer;
  v_now timestamptz := clock_timestamp();
begin
  select max((v_now at time zone m.timezone)::date), count(*)
  into v_latest_today, v_member_count
  from public.shared_habit_members m where m.shared_habit_id = old.id;
  if v_member_count = 0 then
    raise exception 'shared_habit_not_found';
  end if;
  if old.management_locked or v_latest_today >= old.start_date then
    raise exception 'shared_habit_started';
  end if;
  if new.plant_type not in ('pothos', 'peace_lily', 'pilea', 'snake_plant', 'kimberly_queen', 'lily', 'rose', 'monstera', 'philodendron', 'lotus') then
    raise exception 'shared_habit_invalid_plant';
  end if;
  if v_member_count > 1 and
    (new.target_count, new.interval_count, new.interval_unit, new.num_periods, new.start_date)
    is distinct from
    (old.target_count, old.interval_count, old.interval_unit, old.num_periods, old.start_date)
  then
    raise exception 'shared_habit_goal_locked';
  end if;
  if (new.start_date, new.join_by) is distinct from (old.start_date, old.join_by)
     and (new.start_date < v_latest_today or new.join_by < v_latest_today or new.join_by > new.start_date)
  then
    raise exception 'shared_habit_invalid_dates';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_shared_habit_edit() from public, anon, authenticated;
drop trigger if exists guard_shared_habit_edit on public.shared_habits;
create trigger guard_shared_habit_edit
  before update of name, description, plant_type, target_count, interval_count,
    interval_unit, num_periods, start_date, join_by, max_members
  on public.shared_habits for each row execute function public.guard_shared_habit_edit();

create or replace function public.guard_shared_habit_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_latest_today date;
  v_now timestamptz := clock_timestamp();
begin
  select max((v_now at time zone m.timezone)::date) into v_latest_today
  from public.shared_habit_members m where m.shared_habit_id = old.id;
  if v_latest_today is null then raise exception 'shared_habit_not_found'; end if;
  if old.management_locked or v_latest_today >= old.start_date then raise exception 'shared_habit_started'; end if;
  if new.join_code is not null and new.join_code !~ '^[0-9a-f]{32}$' then
    raise exception 'shared_habit_invalid_code';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_shared_habit_code() from public, anon, authenticated;
drop trigger if exists guard_shared_habit_code on public.shared_habits;
create trigger guard_shared_habit_code
  before update of join_code on public.shared_habits
  for each row execute function public.guard_shared_habit_code();

-- Preview and join share the latest-member start boundary. Join retains
-- its row lock and its idempotent return for an existing member.
create or replace function public.shared_habit_preview(p_code text)
returns table (
  name                text,
  description         text,
  plant_type          text,
  target_count        int,
  interval_count      int,
  interval_unit       text,
  num_periods         int,
  start_date          date,
  join_by             date,
  owner_display_name  text,
  member_count        int,
  max_members         int
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    h.name,
    h.description,
    h.plant_type,
    h.target_count,
    h.interval_count,
    h.interval_unit,
    h.num_periods,
    h.start_date,
    h.join_by,
    p.display_name,
    (select count(*)::int
       from public.shared_habit_members m
       where m.shared_habit_id = h.id),
    h.max_members
  from public.shared_habits h
  join public.profiles p on p.id = h.owner_id
  where h.join_code is not null
    and h.join_code = p_code
    and not h.management_locked
    and (statement_timestamp() at time zone coalesce(
      (select caller.timezone from public.profiles caller where caller.id = auth.uid()), 'UTC'
    ))::date <= h.join_by
    and not exists (
      select 1 from public.shared_habit_members m
      where m.shared_habit_id = h.id
        and (statement_timestamp() at time zone m.timezone)::date >= h.start_date
    );
$$;

revoke execute on function public.shared_habit_preview(text) from public, anon;
grant  execute on function public.shared_habit_preview(text) to authenticated;


-- ---------------------------------------------------------------------
-- 6. join_shared_habit(code)
-- Locks the habit row, then checks the code, whether the caller is already in,
-- the caller's own local date against join_by, and the cap. Returns the habit id.
-- ---------------------------------------------------------------------
create or replace function public.join_shared_habit(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_habit public.shared_habits%rowtype;
  v_tz    text;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'shared_habit_not_found';
  end if;

  select * into v_habit
  from public.shared_habits h
  where h.join_code is not null
    and h.join_code = p_code
  for update;

  if not found then
    raise exception 'shared_habit_not_found';
  end if;

  -- Already a member: nothing to do.
  if exists (
    select 1 from public.shared_habit_members m
    where m.shared_habit_id = v_habit.id and m.user_id = auth.uid()
  ) then
    return v_habit.id;
  end if;

  -- The row lock serializes this check with joining, edits and membership changes.
  -- Existing members were handled above; no new member may join once any
  -- current member has reached the start date in their saved timezone.
  if v_habit.management_locked or exists (
    select 1 from public.shared_habit_members m
    where m.shared_habit_id = v_habit.id
      and (clock_timestamp() at time zone m.timezone)::date >= v_habit.start_date
  ) then
    raise exception 'shared_habit_join_ended';
  end if;

  select p.timezone into v_tz
  from public.profiles p
  where p.id = auth.uid();
  v_tz := coalesce(v_tz, 'UTC');

  if (clock_timestamp() at time zone v_tz)::date > v_habit.join_by then
    raise exception 'shared_habit_join_ended';
  end if;

  select count(*) into v_count
  from public.shared_habit_members m
  where m.shared_habit_id = v_habit.id;

  if v_count >= v_habit.max_members then
    raise exception 'shared_habit_full';
  end if;

  insert into public.shared_habit_members (shared_habit_id, user_id, timezone)
  values (v_habit.id, auth.uid(), v_tz);

  return v_habit.id;
end;
$$;

revoke execute on function public.join_shared_habit(text) from public, anon;
grant  execute on function public.join_shared_habit(text) to authenticated;
