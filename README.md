# Habit Garden

Next.js (React + TypeScript) frontend (`frontend/`), Express backend (`backend/`), Supabase for authentication and the database (`supabase/`).

Contributing? Start with [docs/dev/DEVELOPER.md](docs/dev/DEVELOPER.md).

## Auth setup

Authentication managed by Supabase Auth with google integration. Frontend still has Google OAuth, backend only verifies the user's token. Follow these steps once to run it locally.
### 1. Get access
- Ask the project owner for access to the Supabase project, the **project URL** and the **publishable key**.
- Ask them to add your Google email as a **test user** on the Google consent screen. Without that, Google blocks your sign-in.
### 2. Create your env files
Setup your local `.env` files. Follow the `.env.example`

### 3. Run it
```bash
# terminal 1
cd backend
npm ci
npm run dev        # http://localhost:3000 default

# terminal 2
cd frontend
npm install
npm run dev        # http://localhost:5173 default
```
The frontend must run on port **5173**. That is the redirect address configured in Google and Supabase, unless you configure it differently.
### 4. Check it works
1. Open http://localhost:5173. Signed out, it redirects to `/login`.
2. Click **Sign in with Google**. You land on `/` and see your email.
3. Refresh. You stay signed in.
4. Click **Sign out**. `/` redirects back to `/login`.
5. In the Supabase dashboard, **Table Editor > profiles** has a row for your account. A database trigger creates it on signup.
6. `http://localhost:3000/health` returns `{"status":"ok"}`. `/me` returns 401 without a token.

### How it fits together
| Part                              | Where                                | Does                                                                                   |
| --------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------- |
| Supabase client                   | `frontend/src/lib/supabase.ts`       | Creates a centralized Supabase client for frontend to use.                             |
| Session and sign-in               | `frontend/src/auth/`                 | `AuthProvider` restores the session, handles Google sign-in and sign-out               |
| Protected pages                   | `frontend/src/auth/ProtectedRoute.tsx` | Redirects signed-out users to `/login`                                                 |
| Token check                       | `backend/src/auth.ts`                | `requireUser` verifies the `Authorization: Bearer <token>` header with Supabase        |
| Profile on signup, delete account | `supabase/migrations/`               | A trigger creates a `profiles` row. `delete_my_account()` deletes the caller's account |

Protected routes only hide pages in the browser. The real protection is row-level security in the database and the backend's token check.The token expired, or `backend/.env` points to a different project                           |
