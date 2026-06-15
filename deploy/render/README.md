# Render adapter

A Render Blueprint that provisions two services from the shared root image: a
web service (API + dashboard) and a background worker (prune loop). No disk —
Airlock keeps no database.

## The engine requirement

Render exposes no local Docker socket, so the API runs as the **control plane**
pointed at a **remote Docker engine** over TLS (`AIRLOCK_DOCKER_HOST`).
Provision that engine separately. Without it the dashboard loads but launching
a session fails.

## Deploy

1. Push this repo to a Git provider Render can read.
2. In Render: **New → Blueprint**, point it at the repo. Render reads
   `deploy/render/render.yaml`.
3. Fill the `sync: false` secrets in the dashboard:
   - `AIRLOCK_API_TOKEN` — `openssl rand -hex 32`
   - `AIRLOCK_INTERNAL_TOKEN` — a second secret, **identical** on both services
   - `AIRLOCK_DOCKER_HOST` — e.g. `tcp://your-engine:2376`
   - `AIRLOCK_SESSION_HOST`, `AIRLOCK_PUBLIC_BASE_URL` — your public hostname

The dashboard is at the web service's URL; log in with `AIRLOCK_API_TOKEN`.

## How it maps to the contract

| Contract       | This adapter                                              |
| -------------- | --------------------------------------------------------- |
| Image          | Root `Dockerfile`, context `.`.                           |
| API process    | `airlock-api` web service → `bun apps/api/dist/index.js`. |
| Worker process | `airlock-worker` background worker.                       |
| Healthcheck    | `healthCheckPath: /healthz`.                              |
| Browser engine | `AIRLOCK_DOCKER_HOST` (remote, TLS).                      |
| Secret         | `AIRLOCK_API_TOKEN` (dashboard, `sync: false`).           |

## Notes

- The worker reaches the web service over Render's private network at
  `http://airlock-api:8787`. Keep the service name and listen port in sync if
  you change them.
- `AIRLOCK_INTERNAL_TOKEN` must match across both services or the worker's
  prune calls are rejected with 401.
