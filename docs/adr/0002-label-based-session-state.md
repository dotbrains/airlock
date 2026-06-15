# ADR-0002: Label-based session state, no database

**Status**: Accepted
**Owner**: Airlock maintainers
**Date**: 2026-06-15
**Supersedes**: —
**Superseded by**: —

## Context

Airlock has to track every live session: which browser it runs, what target URL
it opened, when it was created, and when it expires. The conventional answer is
a database (or even a single state file) that the control plane reads and writes
alongside the engine.

Airlock is **local-first and disposable**. Each session _is_ a Docker container
that is torn down on expiry or stop. A separate store would add operational
weight — a volume to mount, a schema to migrate, a backup story — and, worse, a
**second source of truth** that can drift from the engine. If the database says
a session exists but the container is gone (or vice versa), every code path now
has to reconcile the two.

## Decision

Session metadata is stored **entirely as Docker container labels**. There is no
database and no state file. The engine **is** the source of truth.

`packages/shared/src/session-labels.ts` defines the label codec. On
`createSession`, `DockerSessionRuntime` writes these labels onto the container:

| Label                | Value                                    |
| -------------------- | ---------------------------------------- |
| `airlock.managed`    | `"true"` — marks containers Airlock owns |
| `airlock.session_id` | the session UUID                         |
| `airlock.browser`    | the browser kind                         |
| `airlock.target_url` | the URL the session opened               |
| `airlock.created_at` | ISO-8601 creation timestamp              |
| `airlock.expires_at` | ISO-8601 expiry timestamp                |

Everything else derives from those labels at read time:

- **Listing / inspecting** sessions filters containers by `airlock.managed` and
  decodes the rest with `decodeSessionLabels` (rows that fail validation are
  skipped, not surfaced as broken sessions).
- **Expiry** is computed from `airlock.expires_at` by `isExpired` in
  `session-policy.ts` — no scheduler row, just a timestamp comparison.
- **Reaping**: the worker (`apps/worker/src/index.ts`) polls
  `POST /api/internal/prune`, which calls `pruneExpiredSessions` to remove
  expired containers. Containers are also created with `AutoRemove: true` so the
  engine cleans up on stop.

## Consequences

**Positive**: The control plane is **stateless**. Restarting the API
reconstructs the entire session list by inspecting the engine — no recovery
logic, no replay. There are no migrations, no volume to mount, no backup story
(this is what lets the deploy adapters in
[ADR-0004](0004-provider-pluggable-deployment.md) skip persistence entirely).
There is exactly one source of truth, so engine and metadata cannot drift.

**Negative**: Docker label values are size-limited and string-only, so
metadata must stay small and string-encoded. There is **no rich query or
history** — you can list and filter live containers, but you cannot ask "what
ran last Tuesday." There is **no audit trail**: once a container is reaped, its
record is gone.

**Neutral**: The label codec is centralized in `session-labels.ts`, so a future
persistent store would write the same fields through one boundary rather than
scattering schema knowledge across call sites.

## Alternatives considered

- **A database (SQLite/Postgres) for session metadata.** Rejected for v1: it
  adds a volume, a schema, and migrations to a tool whose sessions are
  inherently disposable, and it introduces a second source of truth that can
  diverge from the engine.
- **A single JSON/YAML state file.** Rejected: still a second source of truth
  with the same drift problem, and it reintroduces a volume to mount and
  crash-consistency concerns the label model sidesteps.

## Open items deferred

- A persistent metadata store — for audit logs, history, and richer queries —
  is a future option on Airlock's roadmap (see _Next Steps_ in
  [../architecture.md](../architecture.md)). It would be additive: labels stay
  the live source of truth; the store records history. That change gets its own
  ADR.
