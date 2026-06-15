# Railway adapter

Runs the Airlock control plane on Railway from the shared root image. No
volume — Airlock keeps no database.

`railway.json` configures the **API service**. The cleanup worker is a second
service in the same project that runs the same image with a different start
command (Railway has no multi-process manifest, so add it in the dashboard).

## The engine requirement

Railway exposes no local Docker socket, so the API runs as the **control
plane** pointed at a **remote Docker engine** over TLS (`AIRLOCK_DOCKER_HOST`).
Provision that engine separately. Without it the dashboard loads but launching
a session fails.

## Deploy

```bash
# from the repo root — deploys the API service per railway.json
railway up

# set variables (API service)
railway variables set \
  AIRLOCK_API_TOKEN=$(openssl rand -hex 32) \
  AIRLOCK_INTERNAL_TOKEN=$(openssl rand -hex 32) \
  AIRLOCK_DOCKER_HOST=tcp://your-engine:2376 \
  AIRLOCK_SESSION_HOST=your-engine-host \
  AIRLOCK_PUBLIC_BASE_URL=https://your-app.up.railway.app
```

Then add the **worker service** in the Railway dashboard:

- Same repo/image, **start command**: `bun apps/worker/dist/index.js`
- Variables: `AIRLOCK_API_BASE_URL=http://<api-service>.railway.internal:8787`
  and the **same** `AIRLOCK_INTERNAL_TOKEN` as the API service.

## How it maps to the contract

| Contract       | This adapter                                                     |
| -------------- | ---------------------------------------------------------------- |
| Image          | Root `Dockerfile` (`railway.json` builder).                      |
| API process    | `startCommand: bun apps/api/dist/index.js`.                      |
| Worker process | A second service, start command `bun apps/worker/dist/index.js`. |
| Healthcheck    | `healthcheckPath: /healthz`.                                     |
| Browser engine | `AIRLOCK_DOCKER_HOST` (remote, TLS).                             |
| Secret         | `AIRLOCK_API_TOKEN` Railway variable.                            |

## Notes

- Use Railway's private networking (`*.railway.internal`) for the worker →
  API hop so the prune traffic never leaves the project.
- `AIRLOCK_INTERNAL_TOKEN` must match across both services.
