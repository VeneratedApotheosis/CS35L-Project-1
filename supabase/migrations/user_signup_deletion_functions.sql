-- 1. Profile on signup.
-- security definer: profiles has no insert policy, so the trigger must bypass RLS.
-- on conflict do nothing: a duplicate trigger can never make signup fail.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(
      coalesce(
        nullif(new.raw_user_meta_data->>'full_name', ''),
        nullif(new.raw_user_meta_data->>'name', ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'user'
      ),
      50
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Delete my account.
-- Moved: delete_my_account() now handles shared habits and lives in
-- 20261117_04_delete_account_shared_habits.sql. It is not repeated here, so
-- re-running this file cannot bring back the old version.
