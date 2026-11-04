-- ---------------------------------------------------------------------
-- 1. PROFILES: one row per user, created by a trigger on first sign-in
-- Email is in auth.users and is not copied here
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Gardener'
    ), 50),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- 2. HABITS: one row per habit
-- Goal columns (target_count .. timezone) are meant to be locked after creation
-- ---------------------------------------------------------------------
create table public.habits (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid()
                   references public.profiles(id) on delete cascade,
  name           text not null check (char_length(trim(name)) between 1 and 100),
  description    text check (description is null or char_length(description) <= 500),
  plant_type     text not null,
  target_count   int  not null check (target_count between 1 and 50),
  interval_count int  not null check (interval_count between 1 and 365),
  interval_unit  text not null check (interval_unit in ('day', 'week', 'month')),
  num_periods    int  not null check (num_periods between 1 and 52),
  start_date     date not null,
  timezone       text not null,   -- IANA name, e.g. 'America/Los_Angeles'
  created_at     timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 3. ACTIVITY_LOGS: one row per logged activity (insert/delete only)
-- No user_id: the owner is the habit's owner_id
-- ---------------------------------------------------------------------
create table public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  habit_id    uuid not null references public.habits(id) on delete cascade,
  occurred_on date not null,   -- local date in the habit's timezone
  created_at  timestamptz not null default now()
);

create index activity_logs_habit_day_idx
  on public.activity_logs (habit_id, occurred_on);


-- ---------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- A row is invisible/untouchable unless a policy allows it
-- ---------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.habits        enable row level security;
alter table public.activity_logs enable row level security;

-- profiles ------------------------------------------------------------
-- Insert: trigger only (no policy)
-- Delete: via account deletion only
create policy "profiles: read own"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Only display_name and avatar_url may be changed by users
revoke update on public.profiles from anon, authenticated;
grant  update (display_name, avatar_url) on public.profiles to authenticated;

-- habits --------------------------------------------------------------
create policy "habits: read own"
  on public.habits for select to authenticated
  using (owner_id = auth.uid());

create policy "habits: create as yourself"
  on public.habits for insert to authenticated
  with check (owner_id = auth.uid());

create policy "habits: update own"
  on public.habits for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "habits: delete own"
  on public.habits for delete to authenticated
  using (owner_id = auth.uid());

-- activity_logs -------------------------------------------------------
-- Only supports adding and deleting logs (not yet for updating)
create policy "logs: read logs of your habits"
  on public.activity_logs for select to authenticated
  using (exists (
    select 1 from public.habits h
    where h.id = habit_id and h.owner_id = auth.uid()
  ));

create policy "logs: add logs to your habits"
  on public.activity_logs for insert to authenticated
  with check (exists (
    select 1 from public.habits h
    where h.id = habit_id and h.owner_id = auth.uid()
  ));

create policy "logs: delete logs of your habits"
  on public.activity_logs for delete to authenticated
  using (exists (
    select 1 from public.habits h
    where h.id = habit_id and h.owner_id = auth.uid()
  ));