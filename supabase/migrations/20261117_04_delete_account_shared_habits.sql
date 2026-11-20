-- Shared habits, part 4: delete_my_account() handles shared habits first.
--
-- Design: docs/database/design.md, section 8.5. Issue #264.
-- Replaces the version in user_signup_deletion_functions.sql.
--
-- Deleting the user cascades to everything they own. For a shared habit that
-- would delete the whole group's data, so first, for every shared habit the
-- caller owns:
--   1. if another member exists, ownership goes to the one who joined earliest;
--   2. if nobody else is in it, the habit is deleted.
-- Then the user is deleted as before. owner_id is on delete restrict, so if a
-- path ever skipped this step the delete would fail and nothing would be lost.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_habit_id  uuid;
  v_successor uuid;
begin
  if auth.uid() is null then
    return;
  end if;

  for v_habit_id in
    select h.id
    from public.shared_habits h
    where h.owner_id = auth.uid()
    order by h.id
    for update
  loop
    select m.user_id into v_successor
    from public.shared_habit_members m
    where m.shared_habit_id = v_habit_id
      and m.user_id <> auth.uid()
    order by m.joined_at, m.user_id
    limit 1;

    if v_successor is null then
      delete from public.shared_habits where id = v_habit_id;
    else
      update public.shared_habits
      set owner_id = v_successor
      where id = v_habit_id;
    end if;
  end loop;

  -- profiles.id cascades from auth.users, and so do the caller's memberships
  -- and shared logs.
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant  execute on function public.delete_my_account() to authenticated;
