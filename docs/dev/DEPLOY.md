# Test Deploy

Part of the [Developer Guide](DEVELOPER.md). How the backend runs on Render and the frontend on GitHub Pages.

---

## Purpose

Read this file to set up, redeploy or debug the Render test deploy of the backend.

## What's in this file

- [1. How it fits together](#1-how-it-fits-together)
- [2. Backend on Render (first setup)](#2-backend-on-render-first-setup)
- [3. Redeploying](#3-redeploying)
- [4. Checking it](#4-checking-it)
- [5. Problems](#5-problems)
- [6. Frontend on GitHub Pages](#6-frontend-on-github-pages)

---

## 1. How it fits together

| Part | Host | Config |
|---|---|---|
| Backend (Express) | Render web service, free plan | Set up by hand in Render (section 2). `render.yaml` at the repo root lists the same settings |
| Frontend (Next.js) | GitHub Pages as a static export | `.github/workflows/pages.yml`, `frontend/next.config.ts` |
| Database and login | Supabase | Not part of the deploy |

The backend redeploys on every push to `main`. The frontend has to be told the backend address when it is built (`NEXT_PUBLIC_API_URL`).

---

## 2. Backend on Render (first setup)

Needs the repo owner's Render account. Create the service by hand as a **Web Service**. A Blueprint (`render.yaml`) asks for a payment card even on the free plan, so the team deploy does not use it. `render.yaml` stays in the repo as a record of the same settings, for anyone who prefers a Blueprint.

1. In Render: **New > Web Service**, connect the GitHub repo and pick the `main` branch.
2. Fill in the form:

| Field | Value |
|---|---|
| Name | `habit-garden-backend` |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Instance Type | Free |

3. Under **Advanced**: set **Health Check Path** to `/health` and **Auto-Deploy** to **On Commit**. Leave **Build Filters** empty. With a Root Directory set, Render already redeploys only when files under `backend/` change.
4. Add these environment variables:

| Variable | Value |
|---|---|
| `NODE_VERSION` | `24` |
| `SUPABASE_URL` | Same as `backend/.env` |
| `SUPABASE_PUBLISHABLE_KEY` | Same as `backend/.env` |
| `FRONTEND_ORIGIN` | Allowed browser origins, separated by commas. For example `http://localhost:5173,https://<owner>.github.io`. An origin has no path and no trailing slash, so the GitHub Pages one is `https://<owner>.github.io`, not the full site address |

Do not set `PORT`. Render sets it and the server reads it. The backend does not need `SUPABASE_SECRET_KEY` either, so keep it off Render.

5. Create the service. The first build takes a few minutes. Note the service address (`https://habit-garden-backend-xxxx.onrender.com`). The frontend needs it as `NEXT_PUBLIC_API_URL`.

Never put these values in the repo. Change them later in the service's **Environment** tab. Render redeploys when one changes.

---

## 3. Redeploying

- **Automatic:** every push (squash merge) to `main`.
- **Manual:** the service page, **Manual Deploy > Deploy latest commit**. Use it after changing an environment variable, if Render did not redeploy by itself.

---

## 4. Checking it

1. `https://<service>.onrender.com/health` returns `{"status":"ok"}`.
2. `/me` without a token returns 401.
3. Check CORS from a terminal. The first response should include `access-control-allow-origin: http://localhost:5173`, and the second should not include that header:

```bash
curl -si -H "Origin: http://localhost:5173" https://<service>.onrender.com/health
curl -si -H "Origin: https://evil.example.com" https://<service>.onrender.com/health
```

---

## 5. Problems

| Symptom | Likely cause and fix |
|---|---|
| The first request takes up to a minute | The free plan sleeps after 15 minutes without traffic. Wait, then retry |
| Build fails with `tsc: not found` | The build command must install dev dependencies (`npm ci --include=dev`, already in `render.yaml`) |
| Service crashes at start with `Invalid environment in backend/.env` | A variable is missing or empty in Render's **Environment** tab. The message names it |
| Browser shows a CORS error | The page's origin is not in `FRONTEND_ORIGIN`. Check the scheme, the host and that there is no path or trailing slash, then redeploy |

---

## 6. Frontend on GitHub Pages

The workflow `.github/workflows/pages.yml` builds `frontend/` as a static export and publishes it. It runs on every push to `main`, and by hand from the **Actions** tab (**Deploy frontend to GitHub Pages > Run workflow**). The site is at `https://<owner>.github.io/CS35L-Project-1/`.

### First setup (repo owner)

1. **Settings > Pages > Source:** choose **GitHub Actions**.
2. **Settings > Secrets and variables > Actions > Variables:** add three repository variables. They are baked into the public site, so they are variables, not secrets.

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | The Render address, for example `https://habit-garden-backend-xxxx.onrender.com`. No trailing slash |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as `frontend/.env.local` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same as `frontend/.env.local` |

3. **Supabase > Authentication > URL Configuration:** add `https://<owner>.github.io/CS35L-Project-1` and `https://<owner>.github.io/CS35L-Project-1/**` to **Redirect URLs**. Keep the local one, and allow `http://localhost:5173/**` for local invite sign-in (#275). Invite sign-in returns to `/join?code=...`; if that URL is not allowed, Supabase may fall back to the Site URL and lose the invite.
4. **Google Cloud Console:** the Google redirect goes to Supabase, so it usually needs no change. Only if sign-in fails with a redirect error, check that the Supabase callback URL is already in the OAuth client.
5. On Render, `FRONTEND_ORIGIN` must include `https://<owner>.github.io` (an origin has no path).
6. Run the workflow once, then open the site. A changed variable only takes effect after a new run, because the values are built into the files.

### What differs from local development

- Local dev and `next start` are unchanged: served from the root, no export.
- The workflow sets `NEXT_PUBLIC_BASE_PATH=/CS35L-Project-1`. That one setting turns on the static export and the base path (`frontend/next.config.ts`).
- A static export has no server, so a path for every id cannot be built ahead. The habit page is `/habit?id=<id>`, not `/habits/<id>`. Use `habitHref(id)` from `src/lib/paths.ts` for links to it.
- Plain URLs do not get the base path automatically (`<Link>` and the router do). Use `BASE_PATH` from `src/lib/paths.ts` for those, as the favicon and the sign-in redirect do.
- Server-only Next.js features (route handlers, middleware, server actions, cookies, redirects in `next.config.ts`) do not work in a static export. Do not add them.

### Try the export locally

```bash
cd frontend
NEXT_PUBLIC_BASE_PATH=/CS35L-Project-1 npm run build     # writes frontend/out
```

The build passing and `out/habit/index.html` existing is the check. Delete `frontend/out` afterwards (it is git-ignored). On Windows Git Bash put `MSYS_NO_PATHCONV=1` in front, or the leading `/` is rewritten into a Windows path.

### Frontend problems

| Symptom | Likely cause and fix |
|---|---|
| Page shows "Missing NEXT_PUBLIC_API_URL" | The variable is not set under Actions variables, or it was added after the last run. Set it and run the workflow again |
| Styles or scripts 404 | The site was built without the base path. Check the workflow sets `NEXT_PUBLIC_BASE_PATH` |
| After Google sign-in you land on a 404 | The Pages address is not in Supabase **Redirect URLs** (step 3) |
| Browser console shows a CORS error | `FRONTEND_ORIGIN` on Render lacks `https://<owner>.github.io` (step 5) |
| API calls hang for a while at first | Render's free plan was asleep. Wait and retry |
| Workflow fails at the deploy step | Pages source is not set to **GitHub Actions** (step 1) |
