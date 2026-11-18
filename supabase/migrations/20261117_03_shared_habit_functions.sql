-- Shared habits: functions and triggers
--
-- Design: docs/database/design.md, sections 8.1 and 8.4. Issue #263
-- Run after 20261117_02_shared_habit_policies.sql.
--
-- Every function sets search_path to '' (names are written in full), is
-- revoked from public and anon, and is granted to authenticated only, as
-- delete_my_account() is.
--
-- Errors have stable messages so the backend can map them:
--   shared_habit_not_found          404  bad code, closed, or not your habit
--   shared_habit_full               409  member cap reached
--   shared_habit_join_ended         400  the caller's local date is past join_by
--   shared_habit_not_owner          403  only the owner may do this
--   shared_habit_not_member         400  the new owner is not a member
--   shared_habit_started            400  goal and dates are locked after the start
--   shared_habit_cap_below_members  400  max_members below the current member count
--
-- ---------------------------------------------------------------------
-- 1. Trigger add_shared_habit_owner
-- After a shared habit is created, the owner becomes its first member.
-- security definer: the members table has no insert policy.
-- ---------------------------------------------------------------------
create or replace function public.add_shared_habit_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.shared_habit_members (shared_habit_id, user_id, timezone)
  values (
    new.id,
    new.owner_id,
    coalesce(
      (select p.timezone from public.profiles p where p.id = new.owner_id),
      'UTC'
    )
  );
  return new;
end;
$$;

revoke execute on function public.add_shared_habit_owner() from public, anon, authenticated;

drop trigger if exists add_shared_habit_owner on public.shared_habits;
create trigger add_shared_habit_owner
  after insert on public.shared_habits
  for each row execute function public.add_shared_habit_owner();


-- ---------------------------------------------------------------------
-- 2. Trigger check_member_cap (members)
-- A backstop: no path can insert a member past max_members. It locks the habit
-- row first, so two people joining at once cannot both take the last place.
-- ---------------------------------------------------------------------
create or replace function public.check_member_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max   int;
  v_count int;
begin
  select h.max_members into v_max
  from public.shared_habits h
  where h.id = new.shared_habit_id
  for update;

  select count(*) into v_count
  from public.shared_habit_members m
  where m.shared_habit_id = new.shared_habit_id;

  if v_count >= v_max then
    raise exception 'shared_habit_full';
  end if;

  return new;
end;
$$;

revoke execute on function public.check_member_cap() from public, anon, authenticated;

drop trigger if exists check_member_cap on public.shared_habit_members;
create trigger check_member_cap
  before insert on public.shared_habit_members
  for each row execute function public.check_member_cap();


-- ---------------------------------------------------------------------
-- 3. Trigger check_max_members (shared_habits)
-- The other half of the cap: max_members cannot drop below the member count.
-- The update has already locked the row, so this cannot race a join.
-- ---------------------------------------------------------------------
create or replace function public.check_max_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.max_members < (
    select count(*)
    from public.shared_habit_members m
    where m.shared_habit_id = new.id
  ) then
    raise exception 'shared_habit_cap_below_members';
  end if;

  return new;
end;
$$;

revoke execute on function public.check_max_members() from public, anon, authenticated;

drop trigger if exists check_max_members on public.shared_habits;
create trigger check_max_members
  before update of max_members on public.shared_habits
  for each row execute function public.check_max_members();


-- ---------------------------------------------------------------------
-- 4. Trigger lock_started_shared_habit
-- Editing locks once the start date has passed: the goal and the dates cannot
-- change. The group's "today" is the earliest local date among the members, as
-- in the backend. name, description, plant_type, max_members and join_code
-- stay editable.
-- ---------------------------------------------------------------------
create or replace function public.lock_started_shared_habit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_today date;
begin
  if (new.target_count, new.interval_count, new.interval_unit,
      new.num_periods, new.start_date, new.join_by)
     is not distinct from
     (old.target_count, old.interval_count, old.interval_unit,
      old.num_periods, old.start_date, old.join_by)
  then
    return new;
  end if;

  select min((now() at time zone m.timezone)::date) into v_group_today
  from public.shared_habit_members m
  where m.shared_habit_id = old.id;

  if v_group_today >= old.start_date then
    raise exception 'shared_habit_started';
  end if;

  return new;
end;
$$;

revoke execute on function public.lock_started_shared_habit() from public, anon, authenticated;

drop trigger if exists lock_started_shared_habit on public.shared_habits;
create trigger lock_started_shared_habit
  before update on public.shared_habits
  for each row execute function public.lock_started_shared_habit();


-- ---------------------------------------------------------------------
-- 5. shared_habit_preview(code)
-- For the join screen. A valid code with joining open returns one row.
-- Anything else returns no rows and never says why.
-- ---------------------------------------------------------------------
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
    and h.join_code = p_code;
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

  select p.timezone into v_tz
  from public.profiles p
  where p.id = auth.uid();
  v_tz := coalesce(v_tz, 'UTC');

  if (now() at time zone v_tz)::date > v_habit.join_by then
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


-- ---------------------------------------------------------------------
-- 7. shared_habit_members_info(shared_habit_id)
-- The current members with display names. Members only: anyone else gets no rows.
-- ---------------------------------------------------------------------
create or replace function public.shared_habit_members_info(p_shared_habit_id uuid)
returns table (
  user_id      uuid,
  display_name text,
  avatar_url   text,
  joined_at    timestamptz,
  timezone     text,
  is_owner     boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.user_id,
    p.display_name,
    p.avatar_url,
    m.joined_at,
    m.timezone,
    (m.user_id = h.owner_id)
  from public.shared_habit_members m
  join public.shared_habits h on h.id = m.shared_habit_id
  join public.profiles p on p.id = m.user_id
  where m.shared_habit_id = p_shared_habit_id
    and public.is_shared_habit_member(p_shared_habit_id)
  order by m.joined_at, m.user_id;
$$;

revoke execute on function public.shared_habit_members_info(uuid) from public, anon;
grant  execute on function public.shared_habit_members_info(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 8. shared_habit_member_logs(shared_habit_id)
-- Log counts per member per day, for current members only, and only to members.
-- Ordered so the backend can page through it with .range().
-- ---------------------------------------------------------------------
create or replace function public.shared_habit_member_logs(p_shared_habit_id uuid)
returns table (
  user_id     uuid,
  occurred_on date,
  count       int
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    l.user_id,
    l.occurred_on,
    count(*)::int
  from public.shared_habit_logs l
  join public.shared_habit_members m
    on m.shared_habit_id = l.shared_habit_id
   and m.user_id = l.user_id
  where l.shared_habit_id = p_shared_habit_id
    and public.is_shared_habit_member(p_shared_habit_id)
  group by l.user_id, l.occurred_on
  order by l.user_id, l.occurred_on;
$$;

revoke execute on function public.shared_habit_member_logs(uuid) from public, anon;
grant  execute on function public.shared_habit_member_logs(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 9. transfer_shared_habit_ownership(shared_habit_id, new_owner)
-- The only way owner_id changes. The new owner must already be a member.
-- ---------------------------------------------------------------------
create or replace function public.transfer_shared_habit_ownership(
  p_shared_habit_id uuid,
  p_new_owner       uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select h.owner_id into v_owner
  from public.shared_habits h
  where h.id = p_shared_habit_id
  for update;

  -- Someone who is not in the habit cannot tell whether it exists.
  if not found or not public.is_shared_habit_member(p_shared_habit_id) then
    raise exception 'shared_habit_not_found';
  end if;

  if v_owner <> auth.uid() then
    raise exception 'shared_habit_not_owner';
  end if;

  if not exists (
    select 1 from public.shared_habit_members m
    where m.shared_habit_id = p_shared_habit_id and m.user_id = p_new_owner
  ) then
    raise exception 'shared_habit_not_member';
  end if;

  update public.shared_habits
  set owner_id = p_new_owner
  where id = p_shared_habit_id;
end;
$$;

revoke execute on function public.transfer_shared_habit_ownership(uuid, uuid) from public, anon;
grant  execute on function public.transfer_shared_habit_ownership(uuid, uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 10. Backfill: any shared habit created before the owner trigger existed
-- gets its owner's member row.
-- ---------------------------------------------------------------------
insert into public.shared_habit_members (shared_habit_id, user_id, timezone)
select h.id, h.owner_id, coalesce(p.timezone, 'UTC')
from public.shared_habits h
join public.profiles p on p.id = h.owner_id
on conflict (shared_habit_id, user_id) do nothing;
