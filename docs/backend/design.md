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
| `GET /habits` and `GET /habits/:id` | Planned (#130) |
| Log endpoints and calculations | Planned: Week 3 |
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
  routes/              one file per resource: habits, me, logs
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
| `GET /habits` | List own habits | #130 |
| `GET /habits/:id` | Get one habit | #130 |
| `PATCH /habits/:id` | Edit name, description, plant type | #124 (backlog) |
| `DELETE /habits/:id` | Delete a habit | #125 (backlog) |
| `POST /habits/:id/logs` | Add a log, current period only | Week 3 |
| `DELETE /habits/:id/logs/:logId` | Delete a log | Week 3 |
| `GET /habits/:id/progress`, `/streak`, `/summary` | Calculations | Week 3 |
| Delete account | Calls `delete_my_account` | No issue yet |

Routes have no version prefix.

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

There are four stages, the same as the frontend plant engine. Growth never reverses. A plant can reach stage 4 before the end date.

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

`num_periods` is required by the backend for now. What is out of scope for the whole app is listed in [design.md](../design.md#5-out-of-scope).

---

## 9. Configuration

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key. Safe to expose |
| `PORT` | Defaults to 3000 |
| `FRONTEND_ORIGIN` | Allowed CORS origin. The frontend runs on port 5173 |

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
| Logging on a habit that has not started yet | Not decided |
| Changing timezone mid-habit | Past `occurred_on` dates stay as stored. Not decided otherwise |