# Habit Garden: Backend Design

How the Node backend is built: what it does, how a request flows, the routes it exposes and the rules behind every number the app shows. For the big picture, see [design.md](../design.md). For tables and access rules, see [the database design](../database/design.md). For screens, see [the screens](../frontend/screens.md).

---

## Contents

- [1. Status](#1-status)
- [2. Role](#2-role)
- [3. Auth and Supabase access](#3-auth-and-supabase-access)
- [4. Folder layout](#4-folder-layout)
- [5. Request flow](#5-request-flow)
- [6. Endpoints](#6-endpoints)
- [7. Validation, errors and logging](#7-validation-errors-and-logging)
- [8. Calculation rules](#8-calculation-rules)
- [9. Configuration](#9-configuration)
- [10. Testing](#10-testing)
- [11. Deployment](#11-deployment)
- [12. Open items](#12-open-items)

---

## 1. Status

| Item | State |
| --- | --- |
| Project layout, per-request Supabase client, `requireAuth`, `validate`, error handler | Built (#143) |
| `GET` and `PATCH /me` | Built (#131) |
| `POST /habits` | Built (#129) |
| `GET /habits` and `GET /habits/:id`, with `stats` | Built (#130, #199, #200) |
| Calculations in `domain/` (periods, progress, streak, growth, health, badges) | Built (#191 to #194) |
| `POST` and `DELETE` for logs | Built (#196, #197) |
| `GET /dashboard` | Built (#201) |
| Shared habits: endpoints, group stats, join and leave | Planned (design in #216), see sections 6.6 and 8.11 |
| Tests (vitest) | Built, see section 10 |
| Deployment | Open (section 11) |

The code follows the layout in section 4. Spots that are still provisional are marked `[PLACEHOLDER]` in the code.

---

## 2. Role

The backend sits between the frontend and Supabase. For how the three parts connect, see [design.md](../design.md).

**It does:**
- Verify the user's token on every request.
- Validate requests and apply the rules: start date, current period, timezone.
- Do all calculations (section 8).
- Read and write the database as the signed-in user, so Row Level Security stays in force.

**It does not:**
- Render screens or hold UI state.
- Store data or define tables. The schema, policies and triggers are in [the database design](../database/design.md).
- Use an admin key.

A rule lives in one place: business rules are here, not copied into the frontend.

---

## 3. Auth and Supabase access

- **Auth flow.** The frontend signs in with Supabase and gets a token. It sends `Authorization: Bearer <token>`. The backend verifies the token on every route except `/health`.
- **No valid token gets 401.** The request is never served with an elevated key.
- **Client.** A per-request Supabase client built with the publishable key and the user's token, so RLS applies.
- **No admin client.** The secret key is not used. One would be added only for a real job with no user, such as a scheduled task, and each use would need a comment saying why RLS can't be used.
- **Delete account** is a database function (`delete_my_account`), called as the user.
- **Shared habits** need a few `security definer` database functions (join, member names, member log dates), because a non-member cannot read a habit and a member cannot read other members' logs under RLS. The backend still calls them as the user. See [the database design](../database/design.md#8-shared-habits-planned).
- **Edge functions** are on hold.
- **Only `lib/supabase.ts` creates clients.**

---

## 4. Folder layout

Anything not listed here is decided when it is implemented.

```
backend/src/
  server.ts            starts the app
  app.ts               builds the Express app: middleware and routes
  config/env.ts        reads and validates env vars in one place
  lib/                 supabase.ts (the only createClient), logger, errors
  middleware/          requireAuth, validate, errorHandler
  routes/              one file per resource: habits, me, logs, dashboard
  services/            the logic for each route, talks to Supabase
  domain/              pure calculation functions: periods, streaks, growth
```

- `domain/` has no Express or Supabase imports. Plain input, plain output, so it is easy to test.
- There is no separate `controllers/` layer. A route file reads the request and calls a service.

---

## 5. Request flow

1. The request arrives and is logged (method, path, status, time). The `authorization` header is never logged.
2. `requireAuth` verifies the token and attaches the user and their token to the request. No valid token gets 401.
3. `validate` checks the body, params and query with zod. Bad input gets 400.
4. The route calls a service.
5. The service builds the per-request Supabase client, reads or writes, and uses `domain/` for any calculation.
6. The result is sent as JSON. Any thrown error goes to `errorHandler`, which returns the error shape in section 7.

---

## 6. Endpoints

All routes except `/health` need a valid token. The list grows as endpoints are built, and each new one gets its own issue.

| Route | Purpose | Issue |
| --- | --- | --- |
| `GET /health` | Liveness check | Built |
| `GET /me` | Signed-in user, display name and timezone | Built (#131) |
| `PATCH /me` | Update display name and timezone | Built (#131) |
| `POST /habits` | Create a habit | Built (#129) |
| `GET /habits` | List own habits, each with short `stats` | Built (#130, #199) |
| `GET /habits/:id` | Get one habit with full `stats` | Built (#130, #200) |
| `DELETE /habits/:id` | Delete a habit | #125 (backlog) |
| `POST /habits/:id/logs` | Add a log, current period only | Built (#196) |
| `DELETE /habits/:id/logs/:logId` | Delete a log | Built (#197) |
| `GET /dashboard` | Overall view across all habits | Built (#201) |
| Delete account | Calls `delete_my_account` | No issue yet |
| Shared habit routes | See section 6.6 | Planned (#216) |

Routes have no version prefix. There is no route to edit a habit, because habits cannot be edited after creation (see [design.md](../design.md#3-rules-that-cut-across-layers)).

### 6.1 Create a habit

`POST /habits` body:

| Field | Rule |
| --- | --- |
| `name` | Required, 1 to 100 characters |
| `description` | Optional, up to 500 characters |
| `plant_type` | One of `pothos`, `peace_lily`, `pilea` (the plants the app draws; issue #155). Only the backend checks it, and the list must match the frontend's |
| `target_count` | 1 to 50 |
| `interval_count` | 1 to 365 |
| `interval_unit` | `day`, `week` or `month` |
| `num_periods` | 1 to 52, required for now |
| `start_date` | Optional. Today or later. Defaults to today in the user's timezone |

- A start date in the past gets 400.
- `owner_id` is the signed-in user. It is never read from the body.
- The limits match the database constraints, except `plant_type`, which has no database constraint.

### 6.2 Profile

`PATCH /me` takes `display_name` (1 to 50 characters) and `timezone`, an IANA name such as `America/Los_Angeles`. Invalid names get 400, and the database trigger also rejects them. While the timezone is unset, the backend uses UTC.

### 6.3 Logs

`POST /habits/:id/logs` takes an optional body `{ "occurred_on": "2026-11-05" }`. With no body, or no date, the log is for today in the user's timezone.

| Case | Result |
| --- | --- |
| Today, or an earlier day in the current period | 201 |
| A date in the future | 400 |
| A date in an earlier period, which is locked | 400 |
| Any date on an expired habit | 400 |
| A habit that has not started, for today | 201, and the log counts toward the first period |
| A habit that has not started, for any other day | 400 |
| Another user's habit, or no such habit | 404 |

The response is `{ "log": { id, habit_id, occurred_on }, "stats": <short stats> }`. The stats come with it so the app can move the bar and grow the plant from one response.

`DELETE /habits/:id/logs/:logId` deletes a log in the current period and returns `{ "stats": <short stats> }`. A log in an earlier period, or on an expired habit, gets 400, because those periods are locked. A missing log, or a log on another user's habit, gets 404.

### 6.4 Stats

Stats are calculated by the rules in section 8 whenever they are asked for, and nothing is stored. Dates are `YYYY-MM-DD`, and rates are numbers from 0 to 1 (or `null` when there is nothing to calculate yet).

`GET /habits` adds a short `stats` block to every habit, for the Garden:

| Field | Meaning |
| --- | --- |
| `state` | `not_started`, `active` or `expired` |
| `current_period` | `number`, `total`, `start`, `end` (the first day of the next period), `count` and `target`. Before the start it is the first period, and after the end it is the last one |
| `overall_progress` | Rule 8.3, or `null` for a habit with no end |
| `stage` | Growth stage, 1 to 4 (rule 8.7) |
| `health` | `healthy`, `slightly_wilted` or `wilted` (rule 8.8) |

`GET /habits/:id` adds a full `stats` block, for the Details page. It has everything above plus:

| Field | Meaning |
| --- | --- |
| `end_date` | The first day after the last period, or `null` |
| `consistency` | `successful`, `completed` and `rate` (rule 8.4) |
| `streak` | Rule 8.6 |
| `periods` | Every period with `number`, `start`, `end`, `count`, `target`, `met` and `status` (`completed`, `current` or `upcoming`) |
| `log_days` | One entry per day that has logs, oldest first, as `{ date, count }`, for the calendar |
| `current_period_logs` | The logs that can still be deleted, as `{ id, occurred_on }`. Empty once the habit has expired |

The list reads the logs of the whole page in one query, not one per habit.

### 6.5 Dashboard

`GET /dashboard` returns the overall view across all of the user's habits:

| Field | Meaning |
| --- | --- |
| `active_count` | Habits that have not expired, including ones not started yet |
| `overall_consistency` | Rule 8.5, or `null` until a habit has finished a period |
| `best_streak` | `{ id, name, streak }` for the active habit with the longest streak, or `null` when every streak is 0 |
| `habits` | Every active habit with its `streak`, `consistency`, `health` and `state`, longest streak first |
| `needs_attention` | Active habits whose plant is not healthy, wilted first. A missed last period always makes the plant at least slightly wilted, so this covers both |
| `finished` | Expired habits with `end_date`, `progress`, `consistency` and `badge`, most recently ended first. A badge of `none` means the habit failed |

### 6.6 Shared habits (planned)

Not built yet. Route names are provisional. All routes need a token and return the error shape in section 7. The tables and functions behind them are in [the database design](../database/design.md#8-shared-habits-planned), and the group rules are in [8.11](#811-shared-habits-planned).

| Route | Purpose |
| --- | --- |
| `POST /shared-habits` | Create a shared habit. The owner becomes its first member |
| `GET /shared-habits` | List the shared habits the user is in, each with short group stats |
| `GET /shared-habits/:id` | One shared habit with the group stats, every member's summary and the caller's own full stats |
| `PATCH /shared-habits/:id` | The owner edits it, within the rules below |
| `DELETE /shared-habits/:id` | The owner deletes the habit and everything in it |
| `GET /shared-habits/preview/:code` | What the join screen shows for a code: name, goal, dates, owner, places left |
| `POST /shared-habits/join` | Join with a code |
| `POST /shared-habits/:id/logs` | Add a log for the caller |
| `DELETE /shared-habits/:id/logs/:logId` | Delete one of the caller's logs |
| `DELETE /shared-habits/:id/members/me` | Leave. The owner cannot leave until they transfer ownership |
| `DELETE /shared-habits/:id/members/:userId` | The owner removes a member |
| `POST /shared-habits/:id/transfer` | The owner hands ownership to a member |
| `POST /shared-habits/:id/code` and `DELETE /shared-habits/:id/code` | The owner regenerates the join code, or closes joining |

**Creating.** The body has the same goal fields as a personal habit (section 6.1) plus `join_by` and `max_members`. `start_date` must be today or later. `join_by` must be between today and `start_date`. `max_members` is at least 2 and at most the system maximum. The calling user's timezone is copied to their member row.

**Editing (owner only).** Nobody can edit after the start date.

| State | What can change |
| --- | --- |
| Owner is the only member, before the start | Everything: goal, dates, `join_by`, `max_members`, name, description, plant |
| Someone else has joined, before the start | Name, description, plant, `join_by` and `max_members` (not below the member count). The goal and start date are locked |
| After the start | Nothing |

**Joining.** The join screen first calls the preview route, which returns nothing for a wrong, closed or expired code and never says which. Joining succeeds only while the joiner's own local date is on or before `join_by` and the habit is not full. Joining twice does nothing. Nobody joins after the start date.

**Leaving and removal.** A member leaves with their past logs kept. Group numbers cover current members only. The owner can remove a member, which counts as that member leaving. The owner transfers ownership first if they want to leave. Deleting the habit removes every member and log.

**Logging.** The same rules as section 8.1, with two differences: nobody can log before the start date, and a member only ever adds or deletes their own logs.

**Stats.** The list gives each shared habit the short block from 6.4 with the group values. The detail adds the group `stats` block, a `members` list with each member's summary (`display_name`, `is_owner`, overall progress, current period count, streak and health) and the caller's own full stats. Other members' exact log dates never leave the backend.

---

## 7. Validation, errors and logging

- **Validation.** zod schemas, one per request, applied by the `validate` middleware.
- **Error shape.** Every error is `{ "error": { "code": "...", "message": "..." } }`. Codes are short strings such as `unauthorized`, `validation_failed`, `not_found`.
- **Status codes.** 400 bad input, 401 no valid token, 404 not found or not yours, 500 unexpected. Another user's habit returns 404, the same as a missing one.
- **Logging.** Each request is logged. The `authorization` header and tokens are never logged. The logger is pino.

---

## 8. Calculation rules

All calculations live in the backend, in `domain/`. Dates use Luxon, which handles IANA timezones. Only habits and activity logs are stored. Progress, consistency, streaks, health, growth and badges are calculated from them whenever they are shown, so they can't go out of sync.

### 8.1 Periods and logging

- A habit has a **target count**, a **recurring period** (interval and unit), a **number of periods** and a **start date**. The user picks the start date: today or later.
- The **timezone** belongs to the user's profile, not the habit. "Today" and period boundaries use it.
- **End date** = start + (number of periods × interval). It is computed, not stored.
- Period *k* covers **[start + k × interval, start + (k+1) × interval)**. Boundaries fall at midnight in the user's timezone. Month periods always count from the original start date, and the day is clamped to the end of a shorter month.
- Each log stores the **date the activity happened** (`occurred_on`, a local date) and the time it was logged.
- Users can log any date in the **current period**, up to and including today. Future dates are not allowed.
- A habit that **has not started yet** can be logged for today only. That log counts toward the first period, as does any date before the start.
- The first period is the one shown as "this period" before the start, and the last one is shown after the end.
- Several logs on the same day are allowed, with no cap.
- Users can delete logs in the current period. Logs are never edited. To fix one, delete it and add it again.
- A period **locks when it ends**. Locked periods are final.

### 8.2 Current period progress

- Progress = logs this period ÷ target.
- The bar caps at 100%, but the count can exceed the target (4/3).

### 8.3 Overall progress

- Total target = target count × number of periods.
- Overall progress = min(100%, total logs ÷ total target).
- Extra logs in one period make up for shortfalls in another.
- It determines plant growth.

Example (gym 3 times a week for 4 weeks): 5 + 1 + 4 + 2 = 12 of 12, so 100%.

### 8.4 Consistency

- Consistency = successful completed periods ÷ completed periods.
- A period is **successful** if its target was met.
- The current period is excluded.

Example: 5/3 yes, 1/3 no, 4/3 yes, 2/3 no, so 50%.

### 8.5 Overall consistency

The average of each active habit's consistency, leaving out habits with no completed period. It shows "—" when none has finished a period.

### 8.6 Streaks

- Consecutive successful completed periods, per habit.
- A missed period resets the streak to 0.
- **The current period counts once its target is met.** Until then it does not break the streak.
- There is no combined streak across habits.

### 8.7 Plant growth

| Stage | Overall progress |
| --- | --- |
| 1 | 0 to 24% |
| 2 | 25 to 49% |
| 3 | 50 to 74% |
| 4 | 75 to 100% |

There are four stages, the same as the frontend plant engine. Growth never reverses as time passes, and a plant can reach stage 4 before the end date. Deleting a log in the current period lowers progress, so it can lower the stage again.

### 8.8 Plant health

Health % = successful periods ÷ completed periods, over the **last 4 completed periods** (fewer early on).

| State | Health % |
| --- | --- |
| Healthy | 80 to 100% |
| Slightly wilted | 50 to 79% |
| Wilted | 0 to 49% |

Plants are healthy by default before the first period ends, and recover as later goals are met. With 4 periods in the window, one miss (3/4 = 75%) makes the plant slightly wilted.

### 8.9 Completion and badges

- A habit **expires** when its end date passes. Final stats are calculated then. Expired habits accept no new logs.
- Each habit earns at most one badge, at the highest level reached:

| Badge | Requirement |
| --- | --- |
| Gold | Overall progress = 100% and consistency ≥ 80% |
| Silver | Overall progress = 100% |
| Bronze | Overall progress ≥ 60% |
| None | Overall progress < 60% |

With 4 periods, 80% consistency means no misses (3/4 = 75%).

### 8.10 Scope

`num_periods` is required by the backend for now. What is out of scope for the whole app is listed in [design.md](../design.md#6-out-of-scope).

### 8.11 Shared habits (planned)

The rules for the group numbers. Each member's own numbers use sections 8.2 to 8.9 unchanged, with the shared goal and the member's own logs.

- **Periods are calendar dates, the same for everyone.** Period *k* covers the same dates for every member, and a member logs by their own local date.
- **The group's "today" is the earliest local date among the current members.** Each member's timezone is the copy saved when they joined, so a profile change later cannot move it. A period counts as completed for the group once that date has passed it, which is when the westernmost member's day has ended. Group numbers use this `today`, and each member's own numbers use their own.
- **Group progress** is the average of the members' overall progress, each already capped at 100%. A member who never logs counts as 0. The growth stage uses the thresholds in 8.7.
- **Group health** is the average of the members' health rates (met periods over completed periods, over the last four), turned into a state with the thresholds in 8.8. The three labels are not averaged.
- **Leaving.** A member who leaves drops out of the averages and their past logs are kept, so the stage can rise or fall when someone leaves.
- **Completion.** The habit expires when the group's `today` reaches the end date. Each member gets their own badge from their own progress and consistency (8.9). Group badges are not decided yet.
- **Visibility.** Members see names and progress summaries. The exact log dates of other members are used for the calculation and never returned.

---

## 9. Configuration

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key. Safe to expose |
| `PORT` | Defaults to 3000 |
| `FRONTEND_ORIGIN` | Allowed CORS origin. The frontend runs on port 5173. A trailing slash is removed, because a browser's origin never has one |

- The file is `backend/.env`, loaded by `dotenv/config`.
- `config/env.ts` validates these at startup, so a missing one fails with a clear message.
- The secret key is not used and is not in `.env.example`.

---

## 10. Testing

- Tests use vitest and supertest. Run them with `npm test` in `backend/`.
- They use a fake Supabase client (`src/test/fakeSupabase.ts`) and never touch the network or the real database.
- Pure rules in `domain/` are tested directly.
- RLS, column grants and the timezone trigger are not covered by these tests. They need a live database and are checked by hand.
- There is no CI, so run `npm test` before opening a PR.

---

## 11. Deployment

The backend is a normal Node service: `npm run build`, then `npm start`. Set the variables from section 9 on the host. The host and how the frontend is served are open, see [design.md](../design.md#4-deployment).

---

## 12. Open items

| Item | Notes |
| --- | --- |
| Hosting for the backend | Section 11 |
| Changing timezone mid-habit | Past `occurred_on` dates stay as stored. Not decided otherwise. For shared habits the member timezone copy is fixed when they join |
| Shared habits: member cap maximum | The owner chooses the cap. A system maximum is proposed (50), and whether the owner can change it after the start |
| Shared habits: join code | Whether the owner can regenerate or close it (proposed: yes to both), and rate limiting of wrong guesses |
| Shared habits: owner deletes their account | Proposed: ownership goes to the longest-standing member, and the habit is deleted only if nobody else is in it |
| Shared habits: group badges, group streak | Not decided |
| Shared habits: removing members | The owner can remove a member. They could remove weak members to raise the plant. Accepted for now |