# Verifying shared membership serialization

Use a disposable Supabase database after applying the new migration. Never run
these destructive checks against real user data. Create a temporary shared habit
with distinct members A (owner) and B using the application, and record their
UUIDs and the habit UUID. Use two independent SQL sessions connected to that
database. The SQL test sessions must be able to assume the authenticated role.

For each scenario below, reset the fixture so A owns the habit and B is a
member. In session 1, begin a transaction, set A or B as the caller indicated
below, and run its RPC. Keep session 1 open without committing. In session 2,
begin a transaction, set the indicated caller, and run its RPC. It should
**block**. Commit session 1, then check that session 2 unblocks with the expected
error and roll session 2 back. Query the habit and members as an administrator
afterward: the owner must have a membership row.

To set the authenticated caller inside either transaction, replace the
placeholder with the caller's actual UUID:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '<caller-uuid>', true);
```

Use these RPC calls, substituting actual UUIDs:

- Leave B: `select public.delete_shared_habit_member('<habit>', '<B>', true);`
- Remove B: `select public.delete_shared_habit_member('<habit>', '<B>', false);`
- Transfer to B: `select public.transfer_shared_habit_ownership('<habit>', '<B>');`

| Session 1 (kept open) | Session 2 (must block) | Expected session 2 error |
| --- | --- | --- |
| B leaves | A transfers to B | `shared_habit_not_member` |
| A removes B | A transfers to B | `shared_habit_not_member` |
| A transfers to B | B leaves | `shared_habit_owner_cannot_leave` |
| A transfers to B | A removes B | `shared_habit_not_owner` |

Also attempt a direct `delete from public.shared_habit_members` as A and B:
both must fail with permission denied. Verify normal habit deletion still
cascades, and exercise account deletion with disposable accounts, including a
concurrent transfer to the departing account. Never delete the supplied test
accounts from a shared project. The application's live script tests sequential
behavior and both RPC launch orders, but its delays do not establish lock waiting.
