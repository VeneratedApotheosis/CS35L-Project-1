"""Destructive fixture tests: run only against the isolated local Docker database."""
import os
import subprocess
import time
import uuid

container = os.environ.get("TEST_DB_CONTAINER", "supabase_db_codex-271-local-supabase")
if not container.startswith("supabase_db_"):
    raise SystemExit("Expected an isolated local Supabase database container")
base = ["docker", "exec", "-i", container, "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"]
a, b, c, habit, started, removed, account_habit, expired, deadline = (str(uuid.uuid4()) for _ in range(9))

def query(command, expected_error=None):
    result = subprocess.run(base + ["-c", command], capture_output=True, text=True, timeout=20)
    if expected_error:
        assert result.returncode and expected_error in result.stderr, result.stderr
    else:
        assert result.returncode == 0, result.stderr
    return result.stdout.strip()

def auth(user, command):
    return f"begin; set local role authenticated; select set_config('request.jwt.claim.sub','{user}',true); {command}; commit;"

def update(body):
    return f"update public.shared_habits set {body} where id='{habit}' returning id"

try:
    query(f"""
      insert into auth.users(id,email,raw_user_meta_data) values
        ('{a}','{a}@local.test','{{}}'), ('{b}','{b}@local.test','{{}}'), ('{c}','{c}@local.test','{{}}');
      update public.profiles set timezone='Pacific/Pago_Pago' where id in ('{a}','{c}');
      insert into public.shared_habits(id,owner_id,name,plant_type,target_count,interval_count,interval_unit,num_periods,start_date,join_by,max_members)
      values ('{habit}','{a}','Test','pothos',2,1,'week',2,current_date+5,current_date+4,3);
    """)
    # Use distant timezones to exercise the latest-member-local-date rule.
    query(f"update public.shared_habit_members set timezone='Pacific/Pago_Pago' where shared_habit_id='{habit}' and user_id='{a}'")
    # Alone: goal, dates, name, plant and cap may all change before starting.
    query(auth(a, update("name='Updated', description='notes', plant_type='pilea', target_count=3, interval_count=2, interval_unit='month', num_periods=3, start_date=current_date+6, join_by=current_date+3, max_members=4")))
    # A join holds the habit lock; a concurrent goal edit must wait and then
    # observe the newly joined member. This checks the lock protocol from #271.
    first = subprocess.Popen(base, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
    first.stdin.write(f"begin; insert into public.shared_habit_members(shared_habit_id,user_id,timezone) values ('{habit}','{b}','Pacific/Kiritimati');\n\\echo READY\n")
    first.stdin.flush()
    while first.stdout.readline().strip() != "READY":
        if first.poll() is not None:
            raise RuntimeError("join session failed: " + first.stderr.read())
    second = subprocess.Popen(base, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    second.stdin.write("set application_name='codex_272_edit_waiter'; " + auth(a, update("target_count=4")) + "\n")
    second.stdin.close()
    waited = False
    for _ in range(50):
        if query("select count(*) from pg_stat_activity where application_name='codex_272_edit_waiter' and wait_event_type='Lock'") == "1":
            waited = True
            break
        if second.poll() is not None:
            break
        time.sleep(0.1)
    first.stdin.write("commit;\n\\q\n")
    first.stdin.flush()
    first.wait(timeout=10)
    second.wait(timeout=10)
    error = second.stderr.read()
    assert waited and second.returncode and "shared_habit_goal_locked" in error, error

    query(auth(a, update("name='Together', description=null, plant_type='pothos', join_by=current_date+2, max_members=2")))
    for column, value in [("target_count", "4"), ("interval_count", "3"), ("interval_unit", "'week'"), ("num_periods", "4"), ("start_date", "current_date+7")]:
        query(auth(a, update(f"{column}={value}")), "shared_habit_goal_locked")
    query(auth(a, update("max_members=4")))
    query(f"insert into public.shared_habit_members(shared_habit_id,user_id,timezone) values ('{habit}','{c}','UTC')")
    query(auth(a, update("max_members=2")), "shared_habit_cap_below_members")
    query(auth(c, f"select public.delete_shared_habit_member('{habit}', '{c}', true)"))
    query(auth(a, update("join_by=current_date-2")), "shared_habit_invalid_dates")
    query(auth(a, update("join_by=current_date+9")), "shared_habit_invalid_dates")
    query(auth(a, update("plant_type='invalid'")), "shared_habit_invalid_plant")
    query(auth(a, update("join_code=null")))
    query(auth(a, update("join_by=current_date+3")))
    assert query(f"select join_code is null from public.shared_habits where id='{habit}'") == "t"
    query(auth(a, update("join_code='0123456789abcdef0123456789abcdef', max_members=3")))
    assert query(auth(c, "select count(*) from public.shared_habit_preview('0123456789abcdef0123456789abcdef')")).splitlines()[-1] == "1"
    query(auth(c, "select public.join_shared_habit('0123456789abcdef0123456789abcdef')"))
    query(auth(c, f"select public.delete_shared_habit_member('{habit}', '{c}', true)"))
    # A non-owner's direct SQL update and deletion must affect no rows.
    assert a not in query(auth(b, update("name='Not allowed'")))
    assert query(f"select name from public.shared_habits where id='{habit}'") == "Together"
    query(auth(b, f"delete from public.shared_habits where id='{habit}'"))
    assert query(f"select count(*) from public.shared_habits where id='{habit}'") == "1"
    # Use the latest local date as start. This tests that reaching the first
    # member's start locks changes even if another member is still on yesterday.
    query(f"""
      insert into public.shared_habits(id,owner_id,name,plant_type,target_count,interval_count,interval_unit,num_periods,start_date,join_by,max_members)
      select '{started}','{a}','Started','pothos',2,1,'week',2,
        max((clock_timestamp() at time zone timezone)::date), max((clock_timestamp() at time zone timezone)::date), 3
      from public.shared_habit_members where shared_habit_id='{habit}';
      insert into public.shared_habit_members(shared_habit_id,user_id,timezone) values ('{started}','{b}','Pacific/Kiritimati');
    """)
    query(f"""
      insert into public.shared_habits(id,owner_id,name,plant_type,target_count,interval_count,interval_unit,num_periods,start_date,join_by,max_members)
      values ('{deadline}','{a}','Deadline','pothos',1,1,'day',1,current_date+5,current_date-3,2)
    """)
    deadline_code = query(f"select join_code from public.shared_habits where id='{deadline}'")
    assert query(auth(c, f"select count(*) from public.shared_habit_preview('{deadline_code}')")).splitlines()[-1] == "0"
    query(auth(c, f"select public.join_shared_habit('{deadline_code}')"), "shared_habit_join_ended")
    habit = started
    dates = query(f"select count(distinct (clock_timestamp() at time zone timezone)::date) from public.shared_habit_members where shared_habit_id='{habit}'")
    if dates == "1":
        print("NOTE: both member timezones have the same local date now; split-date boundary not observed")
    code = query(f"select join_code from public.shared_habits where id='{habit}'")
    assert query(auth(c, f"select count(*) from public.shared_habit_preview('{code}')")).splitlines()[-1] == "0"
    query(auth(c, f"select public.join_shared_habit('{code}')"), "shared_habit_join_ended")
    assert habit in query(auth(b, f"select public.join_shared_habit('{code}')")), "existing member repeat join must remain idempotent"
    for assignment in ["name='Late'", "description=null", "plant_type='pilea'", "max_members=3", "join_by=current_date", "join_code=null", "join_code='fedcba9876543210fedcba9876543210'"]:
        query(auth(a, update(assignment)), "shared_habit_started")
    # If the member already at the start leaves, the lock must persist even
    # while the owner's saved timezone is still on the preceding date.
    query(auth(b, f"select public.delete_shared_habit_member('{habit}','{b}',true)"))
    assert query(f"select management_locked from public.shared_habits where id='{habit}'") == "t"
    query(auth(a, update("name='Reopened'")), "shared_habit_started")
    query(auth(a, update("join_code=null")), "shared_habit_started")
    assert query(auth(c, f"select count(*) from public.shared_habit_preview('{code}')")).splitlines()[-1] == "0"
    query(auth(c, f"select public.join_shared_habit('{code}')"), "shared_habit_join_ended")
    query(auth(a, update("management_locked=false")), "permission denied")
    # Owner-initiated removal follows the same persistent lock path.
    query(f"""
      insert into public.shared_habits(id,owner_id,name,plant_type,target_count,interval_count,interval_unit,num_periods,start_date,join_by,max_members)
      values ('{removed}','{a}','Remove test','pothos',1,1,'day',2,(clock_timestamp() at time zone 'Pacific/Kiritimati')::date,(clock_timestamp() at time zone 'Pacific/Pago_Pago')::date,3);
      insert into public.shared_habit_members(shared_habit_id,user_id,timezone) values ('{removed}','{b}','Pacific/Kiritimati');
    """)
    query(auth(a, f"select public.delete_shared_habit_member('{removed}','{b}',false)"))
    assert query(f"select management_locked from public.shared_habits where id='{removed}'") == "t"
    query(auth(a, f"update public.shared_habits set name='Reopened' where id='{removed}'"), "shared_habit_started")
    # Account deletion cascades through the same membership trigger.
    query(f"""
      insert into public.shared_habits(id,owner_id,name,plant_type,target_count,interval_count,interval_unit,num_periods,start_date,join_by,max_members)
      values ('{account_habit}','{a}','Account test','pothos',1,1,'day',2,(clock_timestamp() at time zone 'Pacific/Kiritimati')::date,(clock_timestamp() at time zone 'Pacific/Pago_Pago')::date,3);
      insert into public.shared_habit_members(shared_habit_id,user_id,timezone) values ('{account_habit}','{b}','Pacific/Kiritimati');
    """)
    query(auth(b, "select public.delete_my_account()"))
    assert query(f"select management_locked from public.shared_habits where id='{account_habit}'") == "t"
    query(auth(a, f"update public.shared_habits set name='Reopened' where id='{account_habit}'"), "shared_habit_started")
    # Deletion is allowed on or after the start and cascades the members.
    query(auth(a, f"delete from public.shared_habits where id='{habit}'"))
    assert query(f"select count(*) from public.shared_habit_members where shared_habit_id='{habit}'") == "0"
    query(f"""
      insert into public.shared_habits(id,owner_id,name,plant_type,target_count,interval_count,interval_unit,num_periods,start_date,join_by,max_members)
      values ('{expired}','{a}','Expired','pothos',1,1,'day',1,current_date-30,current_date-30,2)
    """)
    habit = expired
    query(auth(a, update("name='Too late'")), "shared_habit_started")
    query(auth(a, update("join_code=null")), "shared_habit_started")
    query(auth(a, f"delete from public.shared_habits where id='{habit}'"))
    print("PASS: edit states, join/edit lock race, permanent start after departure/removal/account deletion, latest-date lock, date and cap validation, invite preview/join boundaries, ownership and cascade")
finally:
    query(f"delete from public.shared_habits where owner_id='{a}'; delete from auth.users where id in ('{a}','{b}','{c}');")
