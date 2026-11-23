# Backend

Express + TypeScript server.

## Setup

Run these commands from the backend directory:

```bash
npm ci
cp .env.example .env
```

The `.env` file configures:
- `PORT`: backend port, default 3000.
- `FRONTEND_ORIGIN`: allowed frontend origin, default http://localhost:5173.
- `SUPABASE_URL`: your Supabase project URL (required).
- `SUPABASE_PUBLISHABLE_KEY`: your Supabase publishable key (required). Never use the secret key here.

## Development

```bash
npm run dev
```

GET http://localhost:3000/health returns HTTP 200 with:
```json
{"status":"ok"}
```

## Build and run

```bash
npm run build
npm start
```

## Checks

```bash
npm run typecheck
npm run lint
npm run format:check
```

Use `npm run format` to format source files.

## Tests

```bash
npm test
npm run test:watch
```

Tests use vitest and a fake Supabase client. They need no `.env` and make no network calls.

## Dependency audit

At setup, `npm audit --omit=dev` reported no vulnerabilities.
The full audit reported moderate minimatch-related findings in the
development tooling. These remain unresolved; the suggested forced
fix would install an incompatible ESLint version.
### Live shared-habit logging check

The Vitest suite uses a fake database. To exercise issue #270 against an
isolated local Supabase project, start the backend with that project's migrations
applied and configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in
`backend/.env`. Add these existing, distinct test accounts to the same ignored
file (fill in their values locally; never commit passwords):

```ini
TEST_USER_A_EMAIL=
TEST_USER_A_PASSWORD=
TEST_USER_B_EMAIL=
TEST_USER_B_PASSWORD=
TEST_USER_C_EMAIL=
TEST_USER_C_PASSWORD=
# Optional; defaults to http://localhost:3000
TEST_API_URL=http://localhost:3000
```

From `backend/`, run `node scripts/shared-habit-logging-live.mjs`.
The backend and script must point to the same isolated local Supabase project.
A and B must have the same current local date in their saved profile timezones.
The script joins a future-start habit, then uses a local Docker/Postgres fixture
helper to move its dates for logging. This privileged test-only adjustment does
not change production validation. The helper defaults to the isolated container
`supabase_db_codex-271-local-supabase`; set `TEST_DB_CONTAINER` for another local
project. Both scripts reject non-local Supabase or backend URLs. The script checks
logging, returned stats, non-member and other-member restrictions, and a direct
RLS read; it then deletes the temporary habit using A's token. If cleanup fails, it prints
the habit ID for manual removal. A crash or interruption may also leave it
behind. This check does not simulate a past period or concurrent requests.


### Live shared-habit membership check

With the same environment and three test accounts described above, start the
backend and run `node scripts/shared-habit-members-live.mjs` from `backend/`.
All three accounts need the same current local date. The script creates and
removes a temporary habit, checks leave, removal, transfer, retained logs, and
group averages. It moves the local fixture's dates after joining to test logging,
and briefly resets them to permit a rejoin before restoring the started date. If cleanup fails, remove the printed habit ID as its owner.
Apply migration `20261119_01_serialize_shared_membership.sql` to the disposable project first. It exercises both launch orders using direct RPCs, and checks direct table deletion is denied. Delays bias the ordering but do not guarantee overlapping transactions; use a controlled multi-session test to verify lock waiting.

### Local shared-habit management database checks

After applying `supabase/migrations/20261120_01_shared_habit_management.sql` to
an isolated local Supabase database, run from the repository root:

```bash
python3 supabase/tests/shared_habit_management_local.py
```

The script uses Docker and creates and deletes disposable local users and habits.
It defaults to `supabase_db_codex-271-local-supabase`; set `TEST_DB_CONTAINER`
to the database container of a separate local Supabase project if needed.
It exercises the edit states, invite deadline and start boundary, permissions,
and a join/edit lock race. Do not point it at a shared database.

For the local HTTP integration check, start the backend with the local
`SUPABASE_URL` and local `SUPABASE_PUBLISHABLE_KEY` in its environment, then
run `node scripts/shared-habit-management-local.mjs` with those same two
variables and `TEST_API_URL` (default `http://127.0.0.1:31973`). The script
rejects non-local URLs and creates and deletes disposable local accounts.

### Local shared-habit badge integration check (#341)

With the isolated `codex-271-local-supabase` stack running on ports 54421 and
54422 and the repository migrations applied, run from `backend/`:

```bash
eval "$(supabase status -o env --workdir /private/tmp/codex-271-local-supabase 2>/dev/null)"
export SUPABASE_URL="$API_URL" SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY"
export PORT=31973 TEST_API_URL=http://127.0.0.1:31973
./node_modules/.bin/tsx src/server.ts > /tmp/codex-341-backend.log 2>&1 &
test_server_pid=$!
node scripts/shared-habit-badges-local.mjs
kill "$test_server_pid"
```

Ensure port 31973 is free before starting the server and check its log to confirm
it started. The script refuses other Supabase URLs or Docker container names,
creates disposable local users and habits, and deletes them in a `finally`
block. It uses privileged local SQL to create historical fixtures and tests the
real API, database functions and RLS using user sessions. Interruption or cleanup
failure can leave fixtures behind. Timezone-boundary coverage is skipped when
both extreme timezones happen to have the same local date.
