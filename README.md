<img src="site/public/favicon.svg" alt="Airlock logo" width="96" height="96" />

# Airlock 🔐

[![License](https://img.shields.io/badge/License-PolyForm_Shield_1.0-blue)](LICENSE)

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.1+-000000?logo=bun&logoColor=white)](https://bun.sh)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Vitest](https://img.shields.io/badge/Vitest-2.x-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![oxlint](https://img.shields.io/badge/oxlint-0.15-A476FF)](https://oxc-project.github.io/)
[![Prettier](https://img.shields.io/badge/Prettier-3.x-F7B93E?logo=prettier&logoColor=black)](https://prettier.io/)
[![Kasm](https://img.shields.io/badge/Kasm-Browsers-2196F3)](https://kasmweb.com/)

Local, disposable browser isolation. Open any link in a short-lived,
containerized browser session — from a **web dashboard** or by **right-clicking
a link**. Like a cloud-browser service, but it runs entirely on your own
machine. No cloud, no account, no data leaving the host.

```mermaid
flowchart LR
    Dash[Web dashboard] --> API[Airlock API]
    Link[Right-click link] --> Ext[Browser extension]
    Ext --> API
    API --> Docker[Docker]
    Docker --> Browser[Kasm browser container]
    Browser --> User[You, sandboxed]
```

## Quick Start

```bash
bun install
cp .env.sample .env
bun run dev:api    # terminal 1 — API
bun run dev:worker # terminal 2 — cleanup worker
bun run dev:web    # terminal 3 — dashboard at http://localhost:5173
```

Or run the whole thing from the shared image with Docker Compose (dashboard +
API + worker on <http://localhost:8787>):

```bash
docker compose up
```

Open the dashboard to launch a browser, or load the
[browser extension](docs/extensions.md) and right-click any link.

## Two ways in

- **Dashboard** (`apps/web`) — launch a browser, watch active sessions count
  down, embed the live stream, terminate. See [docs/web.md](docs/web.md).
- **Extension** — right-click a link → "Open in Airlock". See
  [docs/extensions.md](docs/extensions.md).

## Deploying

Airlock is local-first but **provider-pluggable**: one shared image, adapters
for Docker Compose, a VM, Kubernetes, Fly, Render, and Railway. See
[docs/deployment.md](docs/deployment.md) and [deploy/](deploy/README.md). Set
`AIRLOCK_API_TOKEN` before exposing the API beyond localhost.

## Documentation

- [Architecture](docs/architecture.md) — How it works, monorepo layout, security
- [Configuration](docs/configuration.md) — Environment variables, prerequisites
- [Web Dashboard](docs/web.md) — The browser-based launcher and manager
- [API Reference](docs/api.md) — Endpoint documentation
- [Deployment](docs/deployment.md) — Provider adapters and the deployment contract
- [Extensions](docs/extensions.md) — Loading the Chrome and Firefox extensions

## Checks

```bash
make check   # format, lint, typecheck, test, build (the gate CI runs)
```

## License

[PolyForm Shield 1.0.0](LICENSE) — free to use, modify, and distribute, but not to build a competing product or service.
