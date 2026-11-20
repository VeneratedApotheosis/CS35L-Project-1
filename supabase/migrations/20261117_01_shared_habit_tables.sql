-- Shared habits, part 1: the tables, indexes and checks.
--
-- Design: docs/database/design.md, section 8.2. Issue #261.
-- Safe to run more than once.

-- ---------------------------------------------------------------------
-- 1. SHARED_HABITS: one row per shared habit
-- ---------------------------------------------------------------------
create table if not exists public.shared_habits (
  id             uuid primary key default gen_random_uuid(),
  -- on delete restrict: an owner is never lost silently. delete_my_account()
  -- transfers or deletes the habit first (20261117_04).
  owner_id       uuid not null default auth.uid()
                   references public.profiles(id) on delete restrict,
  name           text not null check (char_length(trim(name)) between 1 and 100),
  description    text check (description is null or char_length(description) <= 500),
  plant_type     text not null,   -- no check: the backend validates the values
  target_count   int  not null check (target_count between 1 and 50),
  interval_count int  not null check (interval_count between 1 and 365),
  interval_unit  text not null check (interval_unit in ('day', 'week', 'month')),
  num_periods    int  not null check (num_periods between 1 and 52),  -- always ends
  start_date     date not null,
  join_by        date not null,
  max_members    int  not null check (max_members between 2 and 50),
  -- 32 random characters. NULL means joining is closed. The owner regenerates
  -- the code by setting a new value.
  join_code      text default replace(gen_random_uuid()::text, '-', ''),
  created_at     timestamptz not null default now(),
  constraint shared_habits_join_by_check check (join_by <= start_date),
  constraint shared_habits_join_code_key unique (join_code)
);

create index if not exists shared_habits_owner_idx
  on public.shared_habits (owner_id);


-- ---------------------------------------------------------------------
-- 2. SHARED_HABIT_MEMBERS: who is in a habit now
-- The owner has a row too (trigger, 20261117_03). Leaving deletes the row.
-- ---------------------------------------------------------------------
create table if not exists public.shared_habit_members (
  shared_habit_id uuid not null
                    references public.shared_habits(id) on delete cascade,
  user_id         uuid not null
                    references public.profiles(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  -- Copy of the member's profile timezone (UTC when unset), taken at join time.
  -- It never follows later profile changes, so the group's lock cannot move.
  timezone        text not null,
  primary key (shared_habit_id, user_id)
);

create index if not exists shared_habit_members_user_idx
  on public.shared_habit_members (user_id);


-- ---------------------------------------------------------------------
-- 3. SHARED_HABIT_LOGS: one row per logged activity (insert/delete only)
-- No foreign key to shared_habit_members on purpose: leaving removes the
-- membership but keeps the past logs, and a cascade would delete them.
-- ---------------------------------------------------------------------
create table if not exists public.shared_habit_logs (
  id              uuid primary key default gen_random_uuid(),
  shared_habit_id uuid not null
                    references public.shared_habits(id) on delete cascade,
  user_id         uuid not null default auth.uid()
                    references public.profiles(id) on delete cascade,
  occurred_on     date not null,   -- the member's local date, as in activity_logs
  created_at      timestamptz not null default now()
);

create index if not exists shared_habit_logs_habit_user_day_idx
  on public.shared_habit_logs (shared_habit_id, user_id, occurred_on);


-- ---------------------------------------------------------------------
-- 4. Lock the tables until the policies exist
-- RLS on with no policy means nobody can read or write. anon gets nothing.
-- ---------------------------------------------------------------------
alter table public.shared_habits        enable row level security;
alter table public.shared_habit_members enable row level security;
alter table public.shared_habit_logs    enable row level security;

revoke all on table public.shared_habits        from anon;
revoke all on table public.shared_habit_members from anon;
revoke all on table public.shared_habit_logs    from anon;
