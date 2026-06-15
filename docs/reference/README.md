# Airlock Reference

Airlock is a local-first, disposable browser-isolation tool. It launches
short-lived, containerized Kasm browser sessions on demand — from a web
dashboard or by right-clicking a link — so untrusted pages open in a sandbox
instead of your everyday browser. There is no database: session state lives in
Docker container labels and is reconciled by a cleanup worker.

This directory holds Airlock's project-meta documentation — the policies and
plans that govern the project rather than its day-to-day usage. For usage and
internals, start at [`../README.md`](../README.md).

## Contents

| Document                           | Purpose                                                  |
| ---------------------------------- | -------------------------------------------------------- |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to set up, build, test, and submit changes.          |
| [SECURITY.md](SECURITY.md)         | How to report vulnerabilities and the response timeline. |
| [ROADMAP.md](ROADMAP.md)           | Current state and near, mid, and long-term direction.    |
| [CHANGELOG.md](CHANGELOG.md)       | Notable changes per release, in Keep a Changelog format. |

## Related Documentation

- [Architecture](../architecture.md) — system overview, module map, and the
  `SessionRuntime` seam.
- [Configuration](../configuration.md) — environment variables and prerequisites.
- [Security](../security.md) — trust model, auth boundaries, and operator controls.
- [Development](../development.md) — the quality gate, tooling, and code layout.
- [Deployment](../deployment.md) and [deploy adapters](../../deploy/README.md) —
  provider adapters and the deployment contract.

## Components

| Component         | Role                                                            |
| ----------------- | --------------------------------------------------------------- |
| `apps/api`        | Express session API; the only module that talks to Docker.      |
| `apps/worker`     | Cleanup loop that prunes expired sessions via the API.          |
| `apps/web`        | React + Vite dashboard SPA for launching and managing sessions. |
| `packages/shared` | Shared contracts: runtime seam, catalog, policy, label codec.   |
| `extensions/`     | Chrome and Firefox "Open in Airlock" link launcher.             |

## License

Airlock is licensed under the [PolyForm Shield License 1.0.0](../../LICENSE) —
free to use, modify, and distribute, but not to build a competing product or
service.
