# ADR-0003: Bearer auth and capability links

**Status**: Accepted
**Owner**: Airlock maintainers
**Date**: 2026-06-15
**Supersedes**: —
**Superseded by**: —

## Context

Airlock's MVP needs to be safe to expose beyond localhost without building a
full multi-user identity system. Two forces shape the auth model:

- The **management API** (`/api/meta`, `/api/sessions*`) mutates state — it
  creates and destroys containers — so it must be gated when reachable.
- The **session link** has to work from a raw browser navigation. The flow is
  `GET /s/:sessionId` → `302` redirect → the browser follows the redirect to
  the VNC stream. A plain navigation cannot carry an `Authorization` header, so
  the link itself cannot be bearer-gated the way the API is.

Building per-user accounts, sessions, and scopes for an MVP would be out of
proportion to a local-first tool.

## Decision

A single shared **bearer token** (`AIRLOCK_API_TOKEN`) gates the management
API. `createBearerAuth` in `apps/api/src/auth.ts` extracts the bearer token
from the `Authorization` header and compares it to the configured secret in
**constant time**
(`timingSafeEqual`), so a wrong token cannot be recovered by timing. The
middleware is applied to `/api/meta` and every `/api/sessions*` route in
`apps/api/src/app.ts`.

**Three paths are intentionally auth-exempt:**

- `/healthz` and `/health` — liveness/readiness probes must work without a
  token (the deploy contract in
  [ADR-0004](0004-provider-pluggable-deployment.md) depends on this).
- `/s/:sessionId` — the session id is a **UUID capability**: itself an
  unguessable bearer. The endpoint resolves the session and returns a `302` that
  the browser follows by plain navigation, which cannot carry an
  `Authorization` header. Guarding it with the bearer token would break the
  redirect flow.

The **internal prune endpoint** (`POST /api/internal/prune`) uses a **separate**
secret, `AIRLOCK_INTERNAL_TOKEN`, sent in the `x-airlock-internal-token` header.
It is the API ↔ worker channel and is deliberately decoupled from the operator-
facing bearer token.

When `AIRLOCK_API_TOKEN` is **unset**, the guard is a no-op so local/dev runs
stay frictionless.

## Consequences

**Positive**: Simple and exposable — one operator-chosen secret protects the
whole management surface, compared in constant time. The capability-link model
makes the extension and redirect flow trivial: hand out a `/s/:id` URL and it
just works from any browser. The worker channel has its own secret, so rotating
one does not affect the other.

**Negative**: The capability model means **anyone with the `/s/:id` URL can
view that session** — there is no per-session ownership check. This is accepted
because the id is an unguessable UUID and sessions have a short TTL
([ADR-0002](0002-label-based-session-state.md)). There are **no per-user
accounts or scopes** — every holder of `AIRLOCK_API_TOKEN` has full management
access. The unset-token behavior is a footgun: an operator who exposes the API
beyond loopback without setting the token has an open control plane. This is
documented loudly in [../architecture.md](../architecture.md) and
[../security.md](../security.md).

**Neutral**: The bearer middleware is a clean seam. Adding OIDC/JWT later means
swapping what `createBearerAuth` does, not re-plumbing every route.

## Alternatives considered

- **Session cookies.** Rejected: cookies add server-side session state and a
  login flow, and they complicate the extension/redirect path. A capability URL
  is stateless and works from a raw navigation.
- **No auth at all.** Rejected for any exposed deployment: the management API
  destroys and creates containers, so it cannot sit open on a reachable port.
  The no-op-when-unset behavior is scoped to local dev only and flagged as
  unsafe to expose.

## Open items deferred

- Multi-user auth (OIDC/JWT) with per-user scopes, plus owner-based
  authorization so a session's creator is the only one who can read or stop it,
  is deferred. It layers on top of the `createBearerAuth` seam rather than
  replacing it. Tracked in _Next Steps_ in
  [../architecture.md](../architecture.md).
