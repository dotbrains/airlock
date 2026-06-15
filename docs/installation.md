# Installation

## Prerequisites

Airlock has two hard prerequisites:

- [Docker Desktop](https://www.docker.com/) or Docker Engine, **running
  locally**. The API talks to the Docker socket to create and remove browser
  containers; nothing works without it.
- [Bun](https://bun.sh) **1.1+** (`engines.bun >= 1.1.0`). Bun runs every
  workspace and is the only package manager the repo uses.

There is no database to provision — session state lives entirely in Docker
container labels (the `airlock.*` prefix), so the control plane is stateless.

## Development checkout

Airlock is a Bun + TypeScript monorepo. Clone it and install every workspace
from the root:

```bash
git clone https://github.com/dotbrains/airlock.git
cd airlock
bun install
cp .env.sample .env
```

`bun install` resolves the workspace graph for all five packages:

| Workspace         | Role                                                    |
| ----------------- | ------------------------------------------------------- |
| `apps/api`        | Express session API; serves the built dashboard in prod |
| `apps/worker`     | Interval prune loop that reaps expired sessions         |
| `apps/web`        | React 18 + Vite 6 dashboard SPA                         |
| `packages/shared` | Shared contracts and types consumed by every app        |

The `.env` file is optional for local dev — every variable has a default. See
[configuration.md](configuration.md) for the full table.

Verify the toolchain with the full quality gate:

```bash
make check
```

## Browser images

Airlock launches [Kasm](https://kasmweb.com/) browser containers (Chromium,
Chrome, Firefox, Edge, Brave, Vivaldi, Tor). Docker pulls the image on first
launch, so the first session of each browser kind is slower while the layers
download. The image tags are configurable per browser via the
`AIRLOCK_IMAGE_*` variables in [configuration.md](configuration.md).

## Docker Compose

To run the full stack — API, dashboard, and worker — from the shared image
instead of three local processes:

```bash
docker compose up
```

This builds the root image and serves everything on <http://localhost:8787>.
The API controls the local Docker engine through `/var/run/docker.sock`. See
[deployment.md](deployment.md) for the provider adapters that build the same
shared image.

## Verifying the install

Confirm Docker and Bun are present and the gate passes:

```bash
docker info        # Docker engine must be reachable
bun --version      # 1.1.0 or newer
make check         # format-check, lint, typecheck, test, build
```

If `make check` passes you have a working toolchain that matches CI. See
[development.md](development.md) for the dev server and the breakdown of each
check, and [troubleshooting.md](troubleshooting.md) when something fails.
