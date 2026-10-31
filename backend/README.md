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

## Dependency audit

At setup, `npm audit --omit=dev` reported no vulnerabilities.
The full audit reported moderate minimatch-related findings in the
development tooling. These remain unresolved; the suggested forced
fix would install an incompatible ESLint version.