# Test Deploy

Part of the [Developer Guide](DEVELOPER.md). How the backend runs on Render. The frontend on GitHub Pages is added in a later change.

---

## Purpose

Read this file to set up, redeploy or debug the Render test deploy of the backend.

## What's in this file

- [1. How it fits together](#1-how-it-fits-together)
- [2. Backend on Render (first setup)](#2-backend-on-render-first-setup)
- [3. Redeploying](#3-redeploying)
- [4. Checking it](#4-checking-it)
- [5. Problems](#5-problems)

---

## 1. How it fits together

| Part | Host | Config |
|---|---|---|
| Backend (Express) | Render web service, free plan | `render.yaml` at the repo root |
| Frontend (Next.js) | GitHub Pages as a static export | Added in the Pages change |
| Database and login | Supabase | Not part of the deploy |

The backend redeploys on every push to `main`. The frontend has to be told the backend address when it is built (`NEXT_PUBLIC_API_URL`).

---

## 2. Backend on Render (first setup)

Needs the repo owner's Render account.

1. In Render: **New > Blueprint**, pick this repo and the `main` branch. Render reads `render.yaml` and proposes the `habit-garden-backend` service.
2. Render asks for the three values marked `sync: false`:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Same as `backend/.env` |
| `SUPABASE_PUBLISHABLE_KEY` | Same as `backend/.env` |
| `FRONTEND_ORIGIN` | Allowed browser origins, separated by commas. For example `http://localhost:5173,https://<owner>.github.io`. An origin has no path and no trailing slash, so the GitHub Pages one is `https://<owner>.github.io`, not the full site address |

3. Apply. The first build takes a few minutes. Note the service address (`https://habit-garden-backend-xxxx.onrender.com`). The frontend needs it as `NEXT_PUBLIC_API_URL`.

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
