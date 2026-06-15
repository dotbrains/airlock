# ADR-0004: Provider-pluggable deployment

**Status**: Accepted
**Owner**: Airlock maintainers
**Date**: 2026-06-15
**Supersedes**: —
**Superseded by**: —

## Context

Airlock is local-first — the recommended deployment is a host you own where the
API can reach the local Docker engine. But teams may want to run it on a generic
VM, an existing Kubernetes cluster, or a managed PaaS (Fly, Render, Railway)
without forking the image or maintaining a per-platform build.

One constraint sets Airlock apart from a stateless web service: the API
**spawns browser containers**, so it must reach a Docker engine. A managed PaaS
exposes no local socket, so "just bind-mount `/var/run/docker.sock`" is not a
universal answer. The deployment story has to span both host-engine and
remote-engine platforms.

## Decision

One shared root `Dockerfile` produces a **single image** that runs either
process; the command selects which:

- API + dashboard: `bun apps/api/dist/index.js` (the default `CMD`)
- cleanup worker: `bun apps/worker/dist/index.js`

Deployment is **provider-pluggable** via thin adapters under `deploy/`
(`docker-compose`, `vm`, `kubernetes`, `fly`, `render`, `railway`). Every
adapter builds that _same_ image and satisfies one documented contract
(`deploy/README.md`):

- API process on internal port **8787** (the image default).
- A single worker process per deployment, sharing `AIRLOCK_INTERNAL_TOKEN`.
- `GET /healthz` as the auth-exempt liveness/readiness probe (see
  [ADR-0003](0003-bearer-auth-and-capability-links.md)).
- A Docker engine reachable via the host socket **or** `AIRLOCK_DOCKER_HOST`.
- `AIRLOCK_API_TOKEN` set whenever the API is reachable beyond loopback.

Because the API must reach an engine, adapters split into **two classes**:

| Class             | How the API reaches Docker           | Adapters                         |
| ----------------- | ------------------------------------ | -------------------------------- |
| **Host engine**   | bind-mount `/var/run/docker.sock`    | Docker Compose, Generic VM       |
| **Remote engine** | `AIRLOCK_DOCKER_HOST` → TLS `tcp://` | Kubernetes, Fly, Render, Railway |

`DockerSessionRuntime` resolves which at startup: a `tcp://` host (with optional
TLS material from `AIRLOCK_DOCKER_CERT_PATH`) takes precedence, otherwise it
falls back to the local socket. There is **no volume and no database** — state
lives in container labels ([ADR-0002](0002-label-based-session-state.md)), so a
stateless image is all an adapter has to run.

Adding a provider is a thin directory under `deploy/<provider>/` plus a
`README.md` of operator commands — build the root `Dockerfile` (do not fork it),
give the API an engine, run both processes, set `AIRLOCK_API_TOKEN`, expose
8787, and probe `/healthz`.

## Consequences

**Positive**: The **same image runs everywhere** — no per-platform fork, no
drift between what you test locally and what you ship. Adding a provider is
cheap: a thin adapter directory against a documented contract, with the Docker
Compose adapter as the smallest end-to-end template. The no-database design
means adapters need no volume, which is what makes managed PaaS viable.

**Negative**: There is an honest, unavoidable constraint: **a platform must
grant some Docker engine access** (a socket or a reachable `tcp://` engine).
There is no no-Docker mode — a platform that offers neither cannot launch
sessions. Managed-PaaS adapters therefore host only the **control plane**
(API + dashboard + worker) pointed at an engine you operate elsewhere, which
means operators on those platforms run two things, not one. A bind-mounted
socket is root-equivalent on the host, so host-engine adapters must keep the API
behind the token and a TLS-terminating proxy.

**Neutral**: The host-engine vs remote-engine split is reflected once, in
`DockerSessionRuntime`'s connection resolver; adapters only supply environment.

## Alternatives considered

- **A separate image (or build) per provider.** Rejected: it multiplies the
  build/test matrix and lets platform images drift from the one you develop
  against.
- **Embed an engine in the image so every platform is self-contained.**
  Rejected: docker-in-docker is heavyweight, privileged, and brittle, and it
  fights managed-PaaS sandboxes. Pointing the control plane at an external
  engine is simpler and honest about the requirement.

## Open items deferred

- An alternate engine class (e.g. Podman or a hosted engine pool) would extend
  the connection resolver behind the `SessionRuntime` seam
  ([ADR-0001](0001-session-runtime-seam.md)); it is not implemented. The full
  contract and provider matrix live in
  [`deploy/README.md`](../../deploy/README.md).
