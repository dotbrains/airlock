# Changelog

All notable changes to Airlock are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - TBD

Initial release.

### Added

- Disposable Kasm browser sessions launched and inspected through the session
  API (`apps/api`), with a cleanup worker (`apps/worker`) that prunes expired
  sessions on an interval.
- Chrome and Firefox "Open in Airlock" extension: right-click a link to open it
  in an isolated session.
- React + Vite dashboard (`apps/web`) to launch sessions, watch them count
  down, embed the live stream, and terminate them.
- Bearer authentication (`AIRLOCK_API_TOKEN`) on the management API, with a
  separate internal token (`AIRLOCK_INTERNAL_TOKEN`) gating the prune endpoint;
  `/healthz`, `/health`, and `/s/:id` are auth-exempt.
- Remote Docker support via `AIRLOCK_DOCKER_HOST` (with optional TLS certs) in
  addition to the local Docker socket.
- A shared Docker image consumed by every deploy adapter, plus provider deploy
  adapters for Docker Compose, a VM, Kubernetes, Fly, Render, and Railway.
- Label-based session state — metadata lives in Docker container labels, with
  no database.
- Quality tooling: `make check` (format, lint, typecheck, test, build),
  lefthook pre-commit hooks, and Blacksmith CI (`make check` + Docker build),
  with a code-scanning workflow running `actionlint` and `gitleaks`.

### Security

- The management API is unauthenticated until `AIRLOCK_API_TOKEN` is set — set
  it before exposing Airlock beyond localhost. A mounted Docker socket is
  root-equivalent on the host; keep the API behind the token and a
  TLS-terminating proxy. See [SECURITY.md](SECURITY.md).

[0.1.0]: https://github.com/dotbrains/airlock/releases/tag/v0.1.0
