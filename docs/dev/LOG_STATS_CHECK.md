# Log, stats and dashboard checks: issue #219

A live check of logging an activity, the Garden, the Habit Details page and
the Dashboard, with two users. Run the backend on port 3000 and the frontend
on port 5173 using the root README, and open http://localhost:5173. These
checks use the real database and real Google accounts, so they cannot be run
by the automated tests. Do them with two test accounts, **A** and **B**, in two
separate browser profiles (or one normal window and one private window) so the
sessions do not overwrite each other.

Record anything that does not match "Expected" as a GitHub issue.

Status: **this walkthrough has not been run yet.** The "Automated" notes say
which parts are already covered by tests; they do not replace the live check.

## Setup

1. Sign in as **A**. In Settings, set the timezone to your own (for example
   `America/Los_Angeles`). Nothing is logged yet.
2. Create "Read" for A: 3 times every week, 4 weeks, starting today.
3. Create "Run" for A: 1 time every day, 3 days, starting **tomorrow** in A's
   timezone. This is the habit that has not started.

## Cases for user A

1. **New habit, no logs.**
   Expected: the Garden shows "Read" at 0/3 this period. Habit Details shows
   0/3, overall progress 0%, consistency "—" (available after the first
   completed period), streak 0. The Dashboard lists 2 active habits
   ("Includes habits that haven't started yet").
   Automated: `backend/src/domain/stats.test.ts` ("describes a new habit with
   no logs"), `backend/src/routes/dashboard.http.test.ts`,
   `frontend/src/views/Dashboard.test.tsx`.

2. **Log today (Garden).** Hold the "Read" plant until the ring fills, or click
   it and use "Log today" in the panel.
   Expected: the count becomes 1/3 without a refresh and the plant may grow.
   Refresh the browser: still 1/3.
   Automated: `backend/src/routes/logs.http.test.ts` (POST returns the new log
   and updated stats), `frontend/src/components/HabitActivity.test.tsx`,
   `frontend/src/components/useHoldToLog.test.tsx`.

3. **Log today and another date (Details).** Open "Read", click "Log today",
   then "Log date" and choose an earlier day of this week.
   Expected: a toast "Activity logged for today." / "Activity logged for
   <date>.", the bar moves, and the calendar and activity list show the day.
   The date choices are only days from the start of this period up to today.
   Automated: `logs.http.test.ts` ("logs an earlier day in the current
   period"), `frontend/src/views/habit/ActivityCalendar.test.tsx`.

4. **Delete a log.** On Details use "Remove one activity on <date>" (activity
   list) or a calendar day's "Remove activity", or "Undo" in the toast.
   Expected: the count drops by 1 everywhere (bar, ring, Garden, Dashboard)
   after the refresh. A log from an earlier week has no remove button.
   Automated: `logs.http.test.ts` (DELETE returns updated stats, 404 for a
   missing log, refused for a locked period),
   `frontend/src/views/habit/ActivityLog.test.tsx`,
   `ActivityCalendar.test.tsx`, `HabitActivity.test.tsx`.

5. **Log past the target (4/3).** Log "Read" four times in the same week.
   Expected: the 4th log is accepted. The bar shows "4/3" and stays at 100%
   (not more), the Garden label reads "4 of 3 this period", overall progress
   is 4/12 (33%) and not capped by the weekly target, and the streak counts
   the week as met. Remove one log: back to 3/3.
   Automated: `logs.http.test.ts` ("accepts a log past the period's target
   and reports it as 4/3"), `backend/src/domain/progress.test.ts` (bar capped
   at 100%), `frontend/src/components/ProgressBar.test.tsx`,
   `HabitProgress.test.tsx`, `PlantCard.test.tsx`, `Garden.test.tsx`.

6. **Habit that has not started.** Look at "Run" in the Garden and on Details.
   Expected: "Not started yet" with its start date; the Dashboard counts it
   as active and lists it as "Not started yet". Logging **today** is allowed
   and counts toward the first period (state stays not started, 1/1). Logging
   any other date is rejected (see case 8). The streak is 0.
   Automated: `logs.http.test.ts` ("allows logging today on a habit that has
   not started", "rejects a past day on a habit that has not started"),
   `stats.test.ts`, `progress.test.ts` ("is 0 before the start"),
   `frontend/src/views/Dashboard.test.tsx`.

7. **Dashboard totals.** Open the Dashboard.
   Expected: active habit count, overall consistency (— until a period has
   ended), best current streak, "A little attention" (wilted or slightly
   wilted plants), and "Current streaks". The numbers match Details. They
   refresh without a reload after you log or remove an activity.
   Automated: `backend/src/domain/dashboard.test.ts`,
   `backend/src/routes/dashboard.http.test.ts`, `frontend/src/views/Dashboard.test.tsx`.

8. **Log on a locked period is rejected.** The UI offers no locked days, so
   this needs a habit whose first period is over. Create "Walk" for A: 1 time
   every day, 5 days, starting today, in the timezone `Pacific/Pago_Pago`
   (Settings). Then in Settings change the timezone to `Pacific/Kiritimati`,
   which is a day or two ahead. Today is now later than "Walk"'s first day, so
   that day is locked. (Or wait until the next day with a daily habit.)
   Expected in the app: "Walk" shows no remove button on its first day, and
   "Log date" only offers the current day. Then confirm the backend refuses it
   directly. Copy the access token from the `Authorization: Bearer ...` header
   of any request in the browser's Network tab:

   ```sh
   curl -i -X POST http://localhost:3000/habits/<walk-id>/logs \
     -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
     -d '{"occurred_on":"<the locked day, YYYY-MM-DD>"}'
   ```

   Expected: `400` with `"code":"validation_failed"` and a message starting
   `occurred_on: must be in the current period`. Also try a future date
   (`occurred_on: cannot be in the future`), and the same `DELETE` on a log
   from the locked day (`400`, "earlier periods are locked"). Also: a log on a
   habit that has ended is refused ("This habit has ended and takes no new
   logs") and its activity shows as locked. Set the timezone back afterwards.
   Automated: `logs.http.test.ts` (locked period, future date, expired habit,
   delete of a locked log), `backend/src/domain/logging.test.ts`,
   `ActivityCalendar.test.tsx` ("earlier ones are locked").

9. **Failure handling.** Stop the backend and click "Log today".
   Expected: an error toast ("Couldn't log activity…"), the count does not
   change. Restart the backend and retry.
   Automated: `frontend/src/components/HabitActivity.test.tsx`.

## Cases with two users (A and B)

Keep A signed in in the first browser profile. In the second, sign in as **B**
and create "Swim" (2 times every week, 4 weeks) and log it once.

10. **Lists are separate.** A's Garden and Dashboard show Read, Run and Walk
    only. B's show Swim only. B's Dashboard counts only B's habits, streaks
    and attention list. Log in as B and A's counts do not change, and the
    reverse.
    Automated: the backend filters habits by owner and reads logs for those
    habits only (`dashboard.http.test.ts`, "filters the habits by owner...";
    `logs.http.test.ts`, "only touches the user's own habit"). The fake database
    cannot show that rows of another user are hidden. Only this live check, or
    a local Supabase, shows that row level security hides them.

11. **B cannot open A's habit.** Copy A's Read URL (`/habit?id=<A-id>`) and open
    it as B.
    Expected: "Habit not found", with no name, counts or logs. A random UUID
    shows the same message.
    Automated: `frontend/src/views/HabitDetails.test.tsx`.

12. **B cannot log to or delete from A's habit through the API.** Using B's
    token (as in case 8) and A's ids:

    ```sh
    curl -i -X POST   http://localhost:3000/habits/<A-habit-id>/logs \
      -H "Authorization: Bearer <B-token>"
    curl -i -X DELETE http://localhost:3000/habits/<A-habit-id>/logs/<A-log-id> \
      -H "Authorization: Bearer <B-token>"
    curl -i http://localhost:3000/habits/<A-habit-id> \
      -H "Authorization: Bearer <B-token>"
    ```

    Expected: all three return `404` (`"code":"not_found"`). Reload as A: no new
    log was added and the log was not deleted. Also, a request with no token
    returns `401`.
    Automated: `logs.http.test.ts` ("returns 404 for a habit that is not the
    user's", POST and DELETE; "returns 401 without a token"). The table
    policies in `supabase/migrations/20261104_01_initial_schema.sql` ("logs:
    read / add / delete logs of your habits") give the same result in the
    database, but no automated test runs them.

13. **Sign out and back in.** Sign out as A and sign in as B in the same
    window: A's habits and logs must not flash or remain. Sign back in as A:
    A's counts are as left.
    Automated: `Garden.test.tsx` (account changes), `Dashboard.test.tsx`.

## Automated checks

From `backend/`:

```sh
npm test
npm run lint
npm run typecheck
```

From `frontend/`:

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Run the frontend plant drawing tests on an idle machine: under load some of the
`src/pottedPlant` tests exceed the 5 second default and time out. They do not
involve logging.
