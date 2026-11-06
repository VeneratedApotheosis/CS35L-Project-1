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