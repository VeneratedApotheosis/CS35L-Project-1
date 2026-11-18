-- Shared habits, part 2: the membership helper, policies and column grants.
--
-- Design: docs/database/design.md, sections 8.1 and 8.3. Issue #262.

-- ---------------------------------------------------------------------
-- 1. is_shared_habit_member: true when the caller has a member row
-- security definer so a policy on shared_habit_members can ask "am I a member"
-- without reading its own table through RLS (infinite recursion).
-- ---------------------------------------------------------------------
create or replace function public.is_shared_habit_member(p_shared_habit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.shared_habit_members m
    where m.shared_habit_id = p_shared_habit_id
      and m.user_id = auth.uid()
  );
$$;

revoke execute on function public.is_shared_habit_member(uuid) from public, anon;
grant  execute on function public.is_shared_habit_member(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 2. shared_habits
-- Read: members, and the owner (so insert ... returning works before the
--       owner trigger has added the owner's member row).
-- Insert: as yourself. Update and delete: the owner.
-- ---------------------------------------------------------------------
drop policy if exists "shared_habits: read as member" on public.shared_habits;
create policy "shared_habits: read as member"
  on public.shared_habits for select to authenticated
  using (owner_id = auth.uid() or public.is_shared_habit_member(id));

drop policy if exists "shared_habits: create as yourself" on public.shared_habits;
create policy "shared_habits: create as yourself"
  on public.shared_habits for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "shared_habits: update as owner" on public.shared_habits;
create policy "shared_habits: update as owner"
  on public.shared_habits for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "shared_habits: delete as owner" on public.shared_habits;
create policy "shared_habits: delete as owner"
  on public.shared_habits for delete to authenticated
  using (owner_id = auth.uid());

-- Users may update only these columns. Never id or owner_id: ownership moves
-- through transfer_shared_habit_ownership(). Whether a column may change right
-- now (after the start date) is a trigger, in 20261117_03.
revoke update on table public.shared_habits from anon, authenticated;
grant  update (
  name, description, plant_type, target_count, interval_count, interval_unit,
  num_periods, start_date, join_by, max_members, join_code
) on table public.shared_habits to authenticated;


-- ---------------------------------------------------------------------
-- 3. shared_habit_members
-- Read: members of the same habit.
-- Insert and update: nobody. Only join_shared_habit() and the owner trigger,
--   which are security definer.
-- Delete: yourself when you are not the owner (leaving), or the owner removing
--   someone else. The owner cannot leave: they transfer the habit or delete it.
-- ---------------------------------------------------------------------
drop policy if exists "members: read members of your habits" on public.shared_habit_members;
create policy "members: read members of your habits"
  on public.shared_habit_members for select to authenticated
  using (public.is_shared_habit_member(shared_habit_id));

drop policy if exists "members: leave or remove" on public.shared_habit_members;
create policy "members: leave or remove"
  on public.shared_habit_members for delete to authenticated
  using (exists (
    select 1
    from public.shared_habits h
    where h.id = shared_habit_members.shared_habit_id
      and (
        (h.owner_id = auth.uid() and shared_habit_members.user_id <> auth.uid())
        or
        (h.owner_id <> auth.uid() and shared_habit_members.user_id = auth.uid())
      )
  ));

revoke insert, update on table public.shared_habit_members from anon, authenticated;


-- ---------------------------------------------------------------------
-- 4. shared_habit_logs
-- Read and delete: your own logs. Insert: as yourself, and only as a member.
-- Update: nobody. Never revoke delete.
-- ---------------------------------------------------------------------
drop policy if exists "shared logs: read own" on public.shared_habit_logs;
create policy "shared logs: read own"
  on public.shared_habit_logs for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "shared logs: add as member" on public.shared_habit_logs;
create policy "shared logs: add as member"
  on public.shared_habit_logs for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_shared_habit_member(shared_habit_id)
  );

drop policy if exists "shared logs: delete own" on public.shared_habit_logs;
create policy "shared logs: delete own"
  on public.shared_habit_logs for delete to authenticated
  using (user_id = auth.uid());

revoke update on table public.shared_habit_logs from anon, authenticated;
