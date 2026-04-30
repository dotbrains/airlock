# Context

Domain glossary and architectural vocabulary for Airlock. Use these terms exactly when writing or reviewing code, docs, ADRs, and PRs.

## Domain

- **Session** — one disposable browser instance. Modeled by `AirlockSession` (sessionId, browser, targetUrl, browserUrl, createdAt, expiresAt) — the only shape that crosses the **Session runtime** seam. Container-engine details (containerId, host port, dockerode status, container name) live as locals inside `DockerSessionRuntime` and never leak to routes, tests, or the internal API client.
- **Browser kind** — one of the supported browsers: `chromium`, `chrome`, `firefox`, `edge`, `brave`, `vivaldi`, `tor`. Defined as the literal union derived from the **browser catalog**.
- **Browser catalog** — the single source of truth in `@airlock/shared/browser-catalog` mapping each `BrowserKind` to its default Kasm image and **container image profile**. Drives the `BrowserKind` type, the zod enum on the request schema, the `isBrowserKind` guard, and the per-browser env-var lookup in config.
- **Container image profile** — `ContainerImageProfile` in `@airlock/shared/container-profile`. Captures everything the runtime needs to know about a browser image family: `containerPort`, `buildLaunchEnv` (env-var contract), and `streamUrl` (host:port → user-facing URL). `KASM_PROFILE` is the only profile today; every catalog entry references it. `DockerSessionRuntime` reads port/env/url through the profile and never hard-codes Kasm specifics.
- **TTL** — the lifetime of a session in seconds. Bounded by `TTL_MIN_SECONDS` (60) and `TTL_MAX_SECONDS` (86400). Default is `TTL_DEFAULT_SECONDS` (1800). Owned by `@airlock/shared/session-policy`.
- **Session policy** — the pure rules over a session's lifetime: `clampTtl`, `expiresAt`, `isExpired`. Lives in `@airlock/shared`. Routes, runtime, and prune all read from this module — there is no other source of truth for "when is a session over."
- **Session labels** — Docker container labels that encode an Airlock-managed session. Encoded by `encodeSessionLabels`, decoded by `decodeSessionLabels`. Anything that inspects containers — `getSession`, `findContainerBySessionId`, `pruneExpiredSessions` — reads through this codec, never via raw label keys. The codec returns `null` for any container missing the managed flag, the sessionId/targetUrl labels, or a parseable createdAt/expiresAt timestamp; downstream code treats `null` as "not an Airlock container."

## Architecture

- **Module / Interface / Implementation / Depth / Seam / Adapter / Leverage / Locality** — see the architecture review vocabulary in `~/.claude/skills/improve-codebase-architecture/LANGUAGE.md`.
- **Session runtime** — the `SessionRuntime` interface in `@airlock/shared` is the API↔implementation seam. Adapters: `DockerSessionRuntime` (production) and `FakeSessionRuntime` (tests).
- **Container engine** — the dockerode client used inside `DockerSessionRuntime`. Injected via constructor (`{ config, docker }`); production wires real dockerode, tests wire a fake. The runtime is the only module allowed to talk to dockerode directly.
- **Internal API client** — `createInternalApiClient` in `@airlock/shared`. Single owner of the `/api/internal/prune` path, the `x-airlock-internal-token` header, and the `PruneResponse` shape. Worker depends on it; API exports the path/header constants and consumes the same response type.
- **Bootstrap** — `discoverEnvFile`, `toInteger`, `trimTrailingSlash` in `@airlock/shared/bootstrap`. Both `apps/api` and `apps/worker` boot via the same env-discovery path.

## Testing

- All tests run via vitest from `apps/api` (`bun run test`). Shared modules are covered there because the api workspace already wires vitest. If shared grows test surface that has no API consumer, add vitest to `packages/shared`.
- Test the `SessionRuntime` adapters by injecting a fake — never reach into dockerode in test code.

## Auth

Intentionally omitted from the MVP. Removed the placeholder `AuthProvider` seam (one adapter, no consumers, untested — a hypothetical seam). When auth lands, ship it with at least one scope-checking consumer and a swap-test so the seam is real.
