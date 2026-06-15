# ADR-0001: SessionRuntime seam over dockerode

**Status**: Accepted
**Owner**: Airlock maintainers
**Date**: 2026-06-15
**Supersedes**: —
**Superseded by**: —

## Context

Airlock's API has to create, inspect, and remove the Docker containers that run
each disposable browser session. The obvious implementation is to import
`dockerode` directly into the HTTP routes and call the engine inline. That
binds two concerns that should be separable:

- The route/HTTP layer needs to be **testable without a running Docker engine**.
  A test that has to start real containers to exercise `POST /api/sessions` is
  slow, flaky, and won't run in CI without privileged access.
- The engine binding should be **swappable**. Today the engine is Docker over a
  socket or `tcp://`; tomorrow it could be Podman or a remote engine class. The
  routes should not care which.

A container is also full of details — its id, its generated name
(`airlock-<uuid>`), the host port the engine maps — that the rest of the system
has no business knowing.

## Decision

The API depends on a **`SessionRuntime` interface** defined in
`packages/shared/src/index.ts`, never on `dockerode` directly. The interface is
the whole contract:

```ts
export interface SessionRuntime {
  createSession(input: CreateSessionInput): Promise<AirlockSession>;
  getSession(sessionId: string): Promise<AirlockSession | null>;
  listSessions(): Promise<AirlockSession[]>;
  stopSession(sessionId: string): Promise<boolean>;
  pruneExpiredSessions(now?: Date): Promise<number>;
}
```

`createApp` in `apps/api/src/app.ts` takes a `SessionRuntime` as a constructor
dependency and routes call only those five methods. **Two real adapters keep
the seam honest:**

- **`DockerSessionRuntime`** (`apps/api/src/docker-session-runtime.ts`) — the
  production adapter. It is the only module that imports `dockerode`, resolves
  the engine connection (socket or `AIRLOCK_DOCKER_HOST`), and creates/inspects/
  removes containers.
- **`FakeSessionRuntime`** (`apps/api/src/__tests__/_fakes.ts`) — an in-memory
  adapter used by the route tests. It records `stopped` ids and `pruneCalls` so
  tests can assert behavior without an engine.

The API and routes never import `dockerode`. Container-level details (container
id, generated name, mapped host port) stay as locals inside
`DockerSessionRuntime` and never cross the public seam — what crosses is the
engine-agnostic `AirlockSession` shape.

## Consequences

**Positive**: Route tests are fast and hermetic — they run against
`FakeSessionRuntime` with no Docker, no privileged CI. The engine is swappable:
a second real adapter (Podman, a remote engine class) drops in behind the same
interface without touching a single route. Container plumbing is encapsulated;
the rest of the system reasons about sessions, not containers.

**Negative**: A layer of indirection sits between the routes and the engine, so
a reader tracing a request has one more hop to follow. Keeping two real adapters
(not one real plus a mock) means the fake must stay faithful to the contract or
tests pass against behavior production never exhibits.

**Neutral**: The interface lives in `packages/shared`, so both the API and any
future consumer share one definition rather than redeclaring it.

## Alternatives considered

- **Import `dockerode` directly in the routes.** Rejected: it couples the HTTP
  layer to the engine, forces a real (or heavily mocked) Docker for every route
  test, and hard-codes Docker as the only possible engine.
- **A single mock instead of a real `FakeSessionRuntime`.** Rejected: a mock
  asserts call shapes, not behavior. A real in-memory adapter that implements
  the full interface exercises the same contract production does and catches
  drift the moment the interface changes.

## Open items deferred

- A second real adapter (Podman or a remote-only engine class) is not
  implemented; the seam is built so it can be added without route changes. The
  module map in [../architecture.md](../architecture.md) shows the seam.
