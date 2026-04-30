# Architecture

## System Overview

```mermaid
flowchart LR
    User[User]
    Ext[Browser Extension]
    API[apps/api<br/>Session API]
    Worker[apps/worker<br/>Cleanup Worker]
    Docker[Docker Engine]
    Container[Kasm Browser Container]

    User -- right-click link --> Ext
    Ext -- POST /api/sessions --> API
    Ext -- GET /s/:id --> API
    API -- create / inspect / remove --> Docker
    Docker -- runs --> Container
    User -- VNC stream --> Container
    Worker -- POST /api/internal/prune --> API
```

The API is the only module that talks to Docker. The worker only knows the public prune endpoint — it never touches the engine directly.

## Session Lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant E as Extension
    participant A as API
    participant D as Docker
    participant C as Container
    participant W as Worker

    U->>E: right-click link
    E->>A: POST /api/sessions { targetUrl }
    A->>D: createContainer (image, labels, port)
    D-->>A: container started, hostPort
    A-->>E: 201 { sessionUrl, browserUrl, expiresAt }
    E->>U: open sessionUrl in new tab
    U->>A: GET /s/:sessionId
    A->>D: inspect labels (decodeSessionLabels)
    A-->>U: 302 -> browserUrl
    U->>C: VNC stream (mapped host port)

    loop every AIRLOCK_CLEANUP_INTERVAL_MS
        W->>A: POST /api/internal/prune
        A->>D: list managed containers
        A->>A: drop expired (isExpired)
        A->>D: remove expired
        A-->>W: { pruned: N }
    end
```

## Module Map

```mermaid
flowchart TB
    subgraph apps
        api[apps/api<br/>Express routes]
        worker[apps/worker<br/>Interval loop]
    end

    subgraph shared[packages/shared]
        runtime[SessionRuntime<br/>interface]
        catalog[browser-catalog]
        profile[container-profile]
        policy[session-policy]
        labels[session-labels<br/>codec]
        intapi[internal-api client]
        boot[bootstrap]
    end

    subgraph adapters[apps/api adapters]
        docker[DockerSessionRuntime]
        fake[FakeSessionRuntime<br/>tests only]
    end

    api --> runtime
    api --> catalog
    api --> policy
    api --> labels
    api --> boot
    worker --> intapi
    worker --> boot
    docker -. implements .-> runtime
    fake -. implements .-> runtime
    docker --> labels
    docker --> profile
    docker --> policy
    docker --> catalog
```

`SessionRuntime` is the API↔implementation seam. Two real adapters keep it honest: `DockerSessionRuntime` in production, `FakeSessionRuntime` in tests.

## Monorepo Layout

```
├── apps/
│   ├── api/          # Session launcher API
│   └── worker/       # Cleanup worker (prunes expired sessions)
├── packages/
│   └── shared/       # Shared contracts and types
├── extensions/
│   └── airlock-link-launcher/
│       ├── chrome/   # Chrome/Brave/Edge extension
│       ├── firefox/  # Firefox extension
│       └── src/      # Shared JS/HTML (symlinked)
└── docker-compose.yml
```

## Auth

Auth is intentionally omitted for the MVP. Add it before exposing Airlock beyond local/dev environments. When a real auth provider is wired in, prefer landing it alongside at least one consumer (e.g. a scope check on `/api/sessions`) and a swap-test, so the seam is exercised rather than shape-only.

## Security Notes

- Sessions are disposable and use Docker `AutoRemove`.
- Session TTL is enforced via container labels + the cleanup worker.
- Browser containers run with isolated filesystem lifecycle (no persistence volumes).
- **Add auth before exposing Airlock beyond local/dev environments.**

## Current Limitations

- Redirect target is `https://<AIRLOCK_SESSION_HOST>:<host-port>` (defaults to `localhost`).
- Kasm stream endpoint uses TLS inside the container; first load may show a certificate warning.
- Session metadata is container-label based and not persisted to a database.

## Next Steps

- Add real auth (OIDC/JWT/session) plus at least one scope-checking consumer.
- Add owner-based authorization checks (session creator can only stop/read own sessions).
- Add rate limits and per-user session quotas.
- Add audit logs and a persistent metadata store.
- Add proxy/VPN egress options for stronger attribution isolation.
