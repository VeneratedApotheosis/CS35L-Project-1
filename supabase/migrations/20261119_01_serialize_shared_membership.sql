-- Serialize membership deletion and ownership transfer on the habit row.
-- Direct member deletion must not bypass this protocol.
drop policy if exists "members: leave or remove" on public.shared_habit_members;
revoke delete on table public.shared_habit_members from public, anon, authenticated;

create or replace function public.delete_shared_habit_member(
  p_shared_habit_id uuid,
  p_user_id uuid,
  p_leave boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_caller uuid := auth.uid();
begin
  select h.owner_id into v_owner
  from public.shared_habits h
  where h.id = p_shared_habit_id
  for update;

  if not found or v_caller is null or not public.is_shared_habit_member(p_shared_habit_id) then
    raise exception 'shared_habit_not_found';
  end if;
  if p_leave is null or p_user_id is null then
    raise exception 'shared_habit_invalid_request';
  end if;
  if p_leave then
    if p_user_id <> v_caller then
      raise exception 'shared_habit_invalid_request';
    end if;
    if v_owner = v_caller then
      raise exception 'shared_habit_owner_cannot_leave';
    end if;
  else
    if v_owner <> v_caller then
      raise exception 'shared_habit_not_owner';
    end if;
    if p_user_id = v_owner then
      raise exception 'shared_habit_owner_cannot_leave';
    end if;
  end if;

  delete from public.shared_habit_members
  where shared_habit_id = p_shared_habit_id and user_id = p_user_id;
  if not found then
    raise exception 'shared_habit_member_not_found';
  end if;
end;
$$;
revoke execute on function public.delete_shared_habit_member(uuid, uuid, boolean) from public, anon;
grant execute on function public.delete_shared_habit_member(uuid, uuid, boolean) to authenticated;

-- Account deletion can cascade memberships. Lock every habit the user belongs
-- to in deterministic order before choosing successors or deleting the user.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_habit_id uuid;
  v_successor uuid;
begin
  if auth.uid() is null then return; end if;

  perform h.id
  from public.shared_habits h
  where h.owner_id = auth.uid() or exists (
    select 1 from public.shared_habit_members m
    where m.shared_habit_id = h.id and m.user_id = auth.uid()
  )
  order by h.id
  for update;

  for v_habit_id in
    select h.id from public.shared_habits h
    where h.owner_id = auth.uid()
    order by h.id
    for update
  loop
    select m.user_id into v_successor
    from public.shared_habit_members m
    where m.shared_habit_id = v_habit_id and m.user_id <> auth.uid()
    order by m.joined_at, m.user_id
    limit 1;
    if v_successor is null then
      delete from public.shared_habits where id = v_habit_id;
    else
      update public.shared_habits set owner_id = v_successor where id = v_habit_id;
    end if;
  end loop;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
