# Airlock Documentation

Airlock is **local-first, disposable browser isolation**: open any link in a
short-lived, containerized Kasm browser — from a web dashboard or by
right-clicking a link — without anything leaving your host. A Bun + TypeScript
monorepo (`apps/api`, `apps/worker`, `apps/web`, `packages/shared`) drives the
local Docker engine and keeps no database; session state lives in container
labels.

These docs are for developers changing Airlock, operators running it, and
integrators driving it over HTTP.

## Start here

- [quickstart.md](quickstart.md) — clone, install, run the checks, and launch
  your first disposable browser.
- [installation.md](installation.md) — prerequisites (Docker, Bun) and the
  developer toolchain.
- [web.md](web.md) — the browser-based dashboard: launch, manage, and view
  sessions.
- [extensions.md](extensions.md) — load the Chrome and Firefox right-click
  launchers.

## Using and changing Airlock

- [development.md](development.md) — contributor workflow, the `make check`
  quality gate, the Vitest seams, and code organization.
- [configuration.md](configuration.md) — the `AIRLOCK_*` environment surface,
  prerequisites, and quick start.
- [architecture.md](architecture.md) — how it works end to end: the session
  lifecycle, the `SessionRuntime` seam, the module map, and security.
- [api.md](api.md) — the HTTP route table, request/response shapes, and auth.
- [openapi.yaml](openapi.yaml) — the machine-readable OpenAPI 3.1 spec.

## Running it

- [security.md](security.md) — the trust model, bearer auth, the auth-exempt
  paths, and the Docker-socket trust boundary.
- [operations.md](operations.md) — operator runbooks: serving, health probing,
  the cleanup loop, token rotation, images, and proxies.
- [deployment.md](deployment.md) — provider-pluggable deployment and the
  deployment contract, with per-provider adapters under
  [`deploy/`](../deploy/README.md).
- [troubleshooting.md](troubleshooting.md) — common local, runtime, and CI
  failures.

## Reference

- [glossary.md](glossary.md) — project terms used across code and docs.
- [adr/](adr/README.md) — architectural decisions (the `SessionRuntime` seam,
  label-based state, bearer auth, provider-pluggable deployment).
- [reference/](reference/README.md) — project meta: `CONTRIBUTING`, `SECURITY`,
  `ROADMAP`, `CHANGELOG`.
