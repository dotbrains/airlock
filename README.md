# Airlock 🔐

[![License](https://img.shields.io/badge/License-PolyForm_Shield_1.0-blue)](LICENSE)

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.1+-000000?logo=bun&logoColor=white)](https://bun.sh)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Vitest](https://img.shields.io/badge/Vitest-2.x-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![oxlint](https://img.shields.io/badge/oxlint-0.15-A476FF)](https://oxc-project.github.io/)
[![Prettier](https://img.shields.io/badge/Prettier-3.x-F7B93E?logo=prettier&logoColor=black)](https://prettier.io/)
[![Kasm](https://img.shields.io/badge/Kasm-Browsers-2196F3)](https://kasmweb.com/)

Local, disposable browser isolation. Right-click any link and open it in a short-lived, containerized browser session.

```mermaid
flowchart LR
    Link[Right-click link] --> Ext[Browser extension]
    Ext --> API[Airlock API]
    API --> Docker[Docker]
    Docker --> Browser[Kasm browser container]
    Browser --> User[You, sandboxed]
```

## Quick Start

```bash
bun install
cp .env.example .env
bun run dev:api    # terminal 1
bun run dev:worker # terminal 2
```

Or with Docker Compose:

```bash
docker compose up
```

Then load the [browser extension](docs/extensions.md) and right-click any link.

## Documentation

- [Architecture](docs/architecture.md) — How it works, monorepo layout, security
- [Configuration](docs/configuration.md) — Environment variables, prerequisites
- [API Reference](docs/api.md) — Endpoint documentation
- [Extensions](docs/extensions.md) — Loading the Chrome and Firefox extensions

## License

[PolyForm Shield 1.0.0](LICENSE) — free to use, modify, and distribute, but not to build a competing product or service.
