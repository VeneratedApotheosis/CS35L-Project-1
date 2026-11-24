# Habit Garden

Next.js (React + TypeScript) frontend (`frontend/`), Express backend (`backend/`), Supabase for authentication and the database (`supabase/`).

Contributing? Start with [docs/dev/DEVELOPER.md](docs/dev/DEVELOPER.md). For how the project fits together (screens, backend, database), read [docs/design.md](docs/design.md).

## Auth setup

Authentication is managed by Supabase Auth with Google sign-in. The frontend signs the user in with Google through Supabase, and the backend only verifies the user's token. Follow these steps once to run it locally. You need Node.js 24 (the version used for deploys).

### 1. Get access
- Ask the project owner for access to the Supabase project, the **project URL** and the **publishable key**.
- Ask them to add your Google email as a **test user** on the Google consent screen. Without that, Google blocks your sign-in.

### 2. Create your env files
Copy each example file and fill in the Supabase values. Both files are git-ignored. Never use the Supabase secret key.
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```
- `backend/.env`: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, plus `PORT` and `FRONTEND_ORIGIN` (the defaults suit local development).
- `frontend/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_API_URL` (the backend address, `http://localhost:3000` by default).

### 3. Run it
```bash
# terminal 1
cd backend
npm ci
npm run dev        # http://localhost:3000 default

# terminal 2
cd frontend
npm ci
npm run dev        # http://localhost:5173
```
The frontend must run on port **5173**. That is the redirect address configured in Google and Supabase, unless you configure it differently.

### 4. Check it works
1. Open http://localhost:5173. Signed out, it redirects to `/login`.
2. Click **Sign in with Google**. You land on `/` (your garden).
3. Open **Settings**. The Account section shows "Signed in as" your email.
4. Refresh. You stay signed in.
5. Click **Sign out** in Settings. `/` redirects back to `/login`.
6. In the Supabase dashboard, **Table Editor > profiles** has a row for your account. A database trigger creates it on signup.
7. `http://localhost:3000/health` returns `{"status":"ok"}`. `/me` returns 401 without a token.

If the app shows "Sign in to continue" or `/me` keeps returning 401, the token expired, or `backend/.env` points to a different project than `frontend/.env.local`.

### How it fits together
| Part                              | Where                                    | Does                                                                                                    |
| --------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Supabase client (frontend)        | `frontend/src/lib/supabase.ts`           | Creates the one Supabase client the frontend uses, for Supabase Auth only                               |
| Session and sign-in               | `frontend/src/auth/`                     | `AuthProvider` restores the session, handles Google sign-in and sign-out                                |
| Protected pages                   | `frontend/src/auth/ProtectedRoute.tsx`   | Redirects signed-out users to `/login`                                                                  |
| API calls                         | `frontend/src/lib/api.ts`                | Sends the user's token to the backend with every call                                                   |
| Token check                       | `backend/src/middleware/requireAuth.ts`  | `requireAuth` verifies the `Authorization: Bearer <token>` header with Supabase                         |
| Supabase client (backend)         | `backend/src/lib/supabase.ts`            | `createUserClient` makes a per-request client that carries the user's token, so row-level security applies |
| Backend settings                  | `backend/src/config/env.ts`              | Validates the `backend/.env` values at startup                                                          |
| Routes, services, rules           | `backend/src/routes/`, `services/`, `domain/` | Routes validate requests, services talk to Supabase, `domain/` holds the calculations              |
| Profile on signup, delete account | `supabase/migrations/`                   | A trigger creates a `profiles` row. `delete_my_account()` deletes the caller's account                  |

Protected routes only hide pages in the browser. The real protection is row-level security in the database and the backend's token check.

## More documentation
- [docs/design.md](docs/design.md): the map of the design, with links to the frontend, backend and database documents.
- [backend/README.md](backend/README.md): backend setup, checks and tests.
- [docs/dev/](docs/dev): how we work, plus [deploying](docs/dev/DEPLOY.md).
