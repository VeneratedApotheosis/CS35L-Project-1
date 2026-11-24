-- Let shared habits use the spider plant and the calathea (issue #287).
-- guard_shared_habit_edit checks plant_type against a fixed list, so the list
-- must match PLANT_TYPES in backend/src/domain/plants.ts. This replaces the
-- function from 20261120_01 with the two new ids added; the trigger on
-- public.shared_habits already points at it, so it is not recreated.

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
  if new.plant_type not in ('pothos', 'peace_lily', 'pilea', 'snake_plant', 'kimberly_queen', 'lily', 'rose', 'monstera', 'philodendron', 'lotus', 'spider_plant', 'calathea') then
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
