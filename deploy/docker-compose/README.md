# Docker Compose adapter

The smallest end-to-end Airlock deployment: the API + dashboard and the cleanup
worker, both from the shared root image, with the API driving the host Docker
engine to spawn browser containers.

## Prerequisites

- Docker Engine running on the host (the API talks to `/var/run/docker.sock`).
- Run all commands from the **repo root**.

## Deploy

```bash
cp deploy/docker-compose/.env.example deploy/docker-compose/.env
# edit .env — at minimum set AIRLOCK_API_TOKEN if you expose the port
AIRLOCK_API_TOKEN=$(openssl rand -hex 32)   # example

docker compose -f deploy/docker-compose/docker-compose.yml up --build
```

The dashboard is then at <http://127.0.0.1:8787>. Paste `AIRLOCK_API_TOKEN`
into the login screen (or leave it unset for a token-free local run).

## Exposing it

The port is bound to `127.0.0.1` by default. To expose Airlock on the network:

1. Set `AIRLOCK_API_TOKEN` to a strong secret in `.env`.
2. Change the API port mapping to `"8787:8787"` in `docker-compose.yml`.
3. Front it with a reverse proxy that terminates TLS, and set
   `AIRLOCK_PUBLIC_BASE_URL` / `AIRLOCK_SESSION_HOST` to the public hostname.

## How it maps to the contract

| Contract       | This adapter                                                       |
| -------------- | ------------------------------------------------------------------ |
| Image          | Built from the root `Dockerfile`, context `../..`.                 |
| API process    | `bun apps/api/dist/index.js` on 8787.                              |
| Worker process | `bun apps/worker/dist/index.js`, sharing `AIRLOCK_INTERNAL_TOKEN`. |
| Healthcheck    | `curl /healthz` (auth-exempt).                                     |
| Browser engine | Host socket bind-mount.                                            |
| Secret         | `AIRLOCK_API_TOKEN` from `.env`.                                   |

## Notes

- **No volume.** Session state lives in Docker container labels, so the control
  plane is stateless. Browser containers are auto-removed on stop/expiry.
- The mounted Docker socket grants the API root-equivalent control of the host
  engine. Run this on a host you trust, and keep the API behind a token.
