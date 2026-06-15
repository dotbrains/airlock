# Generic VM adapter

Run Airlock on any Linux host you own using Docker + systemd. The API drives
the host Docker engine through the socket; the worker reaps expired sessions.

## Prerequisites

- A Linux host with **Docker Engine 20.10+** installed and running. The worker
  unit uses `--add-host host.docker.internal:host-gateway`, which older engines
  reject with an "invalid host-gateway" error.
- The shared image, built once on the host (or pulled from your registry):

  ```bash
  # from a checkout of the repo, on the host or a build box
  docker build -t airlock:latest .
  ```

## Install

1. Copy the unit files and the environment file into place:

   ```bash
   sudo cp deploy/vm/airlock-api.service /etc/systemd/system/
   sudo cp deploy/vm/airlock-worker.service /etc/systemd/system/
   sudo cp deploy/vm/airlock.env.example /etc/airlock.env
   sudo chmod 600 /etc/airlock.env
   ```

2. Edit `/etc/airlock.env` — set `AIRLOCK_API_TOKEN` (the host is networked, so
   a token is required) and a shared `AIRLOCK_INTERNAL_TOKEN`.

3. Enable and start both services:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now airlock-api.service airlock-worker.service
   ```

The API listens on `127.0.0.1:8787`. Front it with nginx/Caddy terminating TLS
and set `AIRLOCK_PUBLIC_BASE_URL` / `AIRLOCK_SESSION_HOST` to the public host.

## How it maps to the contract

| Contract       | This adapter                                                |
| -------------- | ----------------------------------------------------------- |
| Image          | `airlock:latest` from the root `Dockerfile`.                |
| API process    | `airlock-api.service` → `bun apps/api/dist/index.js`.       |
| Worker process | `airlock-worker.service` → `bun apps/worker/dist/index.js`. |
| Healthcheck    | Docker `HEALTHCHECK` (GET /healthz) + `systemctl status`.   |
| Browser engine | Host socket bind-mount in the unit.                         |
| Secret         | `AIRLOCK_API_TOKEN` from `/etc/airlock.env`.                |

## Notes

- No volume: session state lives in Docker container labels.
- The units mount `/var/run/docker.sock`, granting the API control of the host
  engine. Keep the API behind a token and a TLS-terminating proxy.
