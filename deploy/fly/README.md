# Fly.io adapter

Hosts the Airlock control plane (API + dashboard and the cleanup worker) as two
process groups of one shared image. No volume — Airlock keeps no database.

## The engine requirement

Fly does not expose a local Docker socket, so this adapter runs Airlock as the
**control plane** pointed at a **remote Docker engine** over TLS
(`AIRLOCK_DOCKER_HOST`). Provision that engine separately (a VM running
`dockerd` with TLS, on Fly or elsewhere). Without it the API boots and the
dashboard loads, but launching a session fails.

## Deploy

```bash
# from the repo root
fly launch --no-deploy --copy-config -c deploy/fly/fly.toml
fly secrets set \
  AIRLOCK_API_TOKEN=$(openssl rand -hex 32) \
  AIRLOCK_INTERNAL_TOKEN=$(openssl rand -hex 32) \
  AIRLOCK_DOCKER_HOST=tcp://your-engine:2376 \
  AIRLOCK_SESSION_HOST=your-engine-host \
  AIRLOCK_PUBLIC_BASE_URL=https://airlock.fly.dev
fly deploy -c deploy/fly/fly.toml
```

The dashboard is then at `https://<app>.fly.dev`. Paste `AIRLOCK_API_TOKEN`
into the login screen.

## How it maps to the contract

| Contract       | This adapter                                        |
| -------------- | --------------------------------------------------- |
| Image          | Root `Dockerfile`, context `../..`.                 |
| API process    | `api` process group → `bun apps/api/dist/index.js`. |
| Worker process | `worker` process group.                             |
| Healthcheck    | `[[http_service.checks]]` → `/healthz`.             |
| Browser engine | `AIRLOCK_DOCKER_HOST` secret (remote, TLS).         |
| Secret         | `fly secrets set AIRLOCK_API_TOKEN=...`.            |

## Notes

- If you provide TLS client material for the engine, mount it and set
  `AIRLOCK_DOCKER_CERT_PATH`. A plain `tcp://` engine needs neither but must be
  firewalled to the Fly app.
- `min_machines_running = 1` keeps the worker alive; drop to 0 only if you do
  not need automated pruning while idle.
