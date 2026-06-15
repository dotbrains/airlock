# Architecture Decision Records

Decisions that shape Airlock, captured in the MADR format. ADRs are
append-only — when a decision changes, supersede the old ADR with a new one
rather than editing in place.

These ADRs capture the design choices that make Airlock a local-first,
disposable browser-isolation tool: the runtime seam the API depends on, the
label-only session state with no database, the bearer-token-plus-capability-link
auth model, and the provider-pluggable deployment. They live here so the
rationale is not lost. For the system as a whole, see
[../architecture.md](../architecture.md).

## Index

| #                                                | Title                                  | Status   |
| ------------------------------------------------ | -------------------------------------- | -------- |
| [0001](0001-session-runtime-seam.md)             | SessionRuntime seam over dockerode     | Accepted |
| [0002](0002-label-based-session-state.md)        | Label-based session state, no database | Accepted |
| [0003](0003-bearer-auth-and-capability-links.md) | Bearer auth and capability links       | Accepted |
| [0004](0004-provider-pluggable-deployment.md)    | Provider-pluggable deployment          | Accepted |

## How to write a new ADR

1. Copy [`template.md`](template.md) to `NNNN-short-title.md` where NNNN is
   the next four-digit, zero-padded sequential number.
1. Fill in the sections. ADRs should be 1-2 pages — decision-focused, not
   exhaustive.
1. Update this index.
1. Open a PR. A maintainer is the approver.
1. Status flows: Proposed → Accepted → (Deprecated | Superseded by NNNN).
