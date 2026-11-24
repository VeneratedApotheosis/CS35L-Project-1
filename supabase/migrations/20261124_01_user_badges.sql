-- Achievement badges: which badges each user has earned, and when.
--
-- The badge list and the rules stay in backend code
-- (backend/src/domain/achievements/). This table only records the fact "this
-- user earned this badge". Earned badges are permanent: there is no delete
-- policy, and only seen_at can change after insert. See docs/badges-plan.md.
--
-- Safe to run more than once. Run it in the Supabase SQL Editor.

create table if not exists public.user_badges (
  user_id   uuid not null default auth.uid()
              references public.profiles(id) on delete cascade,
  badge_id  text not null check (badge_id ~ '^[a-z0-9-]{1,64}$'),
  earned_at timestamptz not null default now(),
  -- Null until the app has shown the "Badge earned" moment.
  seen_at   timestamptz,
  primary key (user_id, badge_id)
);

alter table public.user_badges enable row level security;

drop policy if exists "badges: read own" on public.user_badges;
create policy "badges: read own"
  on public.user_badges for select to authenticated
  using (user_id = auth.uid());

-- The backend uses the user's own token, so the user could also insert rows
-- directly. Badges are personal with no leaderboard, so this is accepted.
drop policy if exists "badges: add own" on public.user_badges;
create policy "badges: add own"
  on public.user_badges for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "badges: mark seen" on public.user_badges;
create policy "badges: mark seen"
  on public.user_badges for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Permanent: no delete policy, and only seen_at may be updated.
revoke update, delete on public.user_badges from anon, authenticated;
grant  update (seen_at) on public.user_badges to authenticated;

-- Inserts the given badges for the caller and returns only the rows that are
-- new. Two requests at the same time can never both report the same badge.
-- security invoker: row level security still applies, and auth.uid() is the
-- caller.
create or replace function public.award_badges(p_badge_ids text[])
returns setof public.user_badges
language sql
security invoker
set search_path = ''
as $$
  insert into public.user_badges (user_id, badge_id)
  select distinct auth.uid(), badge_id
  from unnest(p_badge_ids) as ids(badge_id)
  on conflict (user_id, badge_id) do nothing
  returning *;
$$;

revoke execute on function public.award_badges(text[]) from public, anon;
grant  execute on function public.award_badges(text[]) to authenticated;
