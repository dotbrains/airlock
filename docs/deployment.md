# Deployment

Airlock is **local-first** — the happy path is running it on a host you own so
the API can reach the local Docker engine. For everything beyond `bun dev`, the
deployment is **provider-pluggable**: every adapter under [`deploy/`](../deploy)
builds and runs the same root `Dockerfile` and satisfies one shared contract.

The full provider matrix, the deployment contract, and a "how to add a
provider" guide live in **[deploy/README.md](../deploy/README.md)**. This page
is the orientation.

## The shared image

The root `Dockerfile` produces one image that runs either process; the command
selects which:

```bash
docker build -t airlock:latest .

# API + dashboard (default CMD)
docker run -p 8787:8787 -e AIRLOCK_API_TOKEN=... \
  -v /var/run/docker.sock:/var/run/docker.sock airlock:latest

# cleanup worker
docker run -e AIRLOCK_API_BASE_URL=http://api:8787 -e AIRLOCK_INTERNAL_TOKEN=... \
  airlock:latest bun apps/worker/dist/index.js
```

The image bundles the compiled dashboard and the API serves it, so a single
container gives you both UI and API on port 8787.

## The browser-engine requirement

Unlike a stateless web app, the Airlock API **spawns browser containers**, so
it must reach a Docker engine. Adapters fall into two classes:

- **Host engine** (Docker Compose, VM) — bind-mount `/var/run/docker.sock`.
  Simplest; recommended.
- **Remote engine** (Kubernetes, Fly, Render, Railway) — point
  `AIRLOCK_DOCKER_HOST` at a TLS-protected `tcp://` engine you operate. These
  platforms expose no local socket, so they host the control plane and drive an
  engine elsewhere.

There is no database to provision — session state lives in Docker container
labels, so the control plane is stateless.

## Picking an adapter

| Provider                                                                                                          | Engine      | Start here if…                               |
| ----------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------- |
| [Docker Compose](../deploy/docker-compose/README.md)                                                              | Host socket | You want the simplest local/self-hosted run. |
| [Generic VM](../deploy/vm/README.md)                                                                              | Host socket | You own a Linux host (systemd units).        |
| [Kubernetes](../deploy/kubernetes/README.md)                                                                      | Remote      | You already run a cluster.                   |
| [Fly.io](../deploy/fly/README.md) / [Render](../deploy/render/README.md) / [Railway](../deploy/railway/README.md) | Remote      | You want a managed control-plane host.       |

## Before exposing it

- Set `AIRLOCK_API_TOKEN`. The management API is unauthenticated without it.
- Terminate TLS at the edge and set `AIRLOCK_PUBLIC_BASE_URL` /
  `AIRLOCK_SESSION_HOST` to the public hostname.
- Treat a mounted Docker socket as root on the host — keep the API behind the
  token and a proxy.
