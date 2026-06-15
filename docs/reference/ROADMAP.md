# Airlock Roadmap

This roadmap tracks Airlock's direction. Items should become focused issues
before implementation. It is grounded in the **Next Steps** and **Current
Limitations** sections of [architecture.md](../architecture.md).

## Status Legend

- `[proposed]` — under discussion.
- `[in-progress]` — actively being built.
- `[shipped]` — available in the current release.
- `[deferred]` — useful, but not in the current slice.

## Current State (v0.1.0)

Airlock today is a local-first, label-backed system with no database:

- Disposable Kasm browser sessions launched via the API and reconciled by the
  cleanup worker.
- A React + Vite **web dashboard** for launching, watching, and terminating
  sessions, and a Chrome/Firefox **extension** for "Open in Airlock".
- **Bearer auth** (`AIRLOCK_API_TOKEN`) gating the management API, with a
  separate internal token for the prune endpoint.
- A shared Docker image and **provider deploy adapters** (compose, vm,
  kubernetes, fly, render, railway).
- **Label-based state** — session metadata lives in Docker container labels;
  there is no persistent metadata store.

## Near Term

### R-01 — Multi-user authentication

Status: `[proposed]`

Add OIDC/JWT authentication on top of the existing bearer-token seam, with
per-user scopes. The bearer guard (`createBearerAuth`) is the integration
point; multi-user auth layers identity onto it without changing the rest of
the request path.

### R-02 — Owner-based authorization

Status: `[proposed]`

Once requests carry an identity, scope session actions to their creator: only
the user who launched a session can stop or read it.

## Mid Term

### R-03 — Rate limits and per-user quotas

Status: `[proposed]`

Add request rate limits and per-user session quotas so a single user cannot
exhaust host resources by launching unbounded containers.

### R-04 — Audit logs and persistent metadata

Status: `[proposed]`

Today session state lives only in container labels. Add a persistent metadata
store and audit logging so session history survives container removal and
operator actions are traceable.

## Long Term

### R-05 — Egress isolation options

Status: `[proposed]`

Add proxy/VPN egress options for browser containers so sessions can present a
different network attribution from the host, strengthening isolation beyond the
filesystem and process boundary.
