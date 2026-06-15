# Glossary

Project terms used across Airlock's code and docs.

**Airlock** — a local-first, self-hostable tool that launches disposable,
isolated browser sessions in throwaway Docker containers and hands back a
short-lived link to a streamed browser. See
[architecture.md](architecture.md).

**API token** — the bearer secret (`AIRLOCK_API_TOKEN`) gating the management
API. Sent as `Authorization: Bearer <token>` and compared in constant time.
When unset the guard is a no-op (frictionless local dev, unsafe to expose). See
[api.md](api.md#authentication).

**Internal token** — the shared secret (`AIRLOCK_INTERNAL_TOKEN`) that
optionally protects `POST /api/internal/prune`, independent of the bearer
`API token`. The worker sends it as the `x-airlock-internal-token` header; the
API enforces it only when configured. See
[configuration.md](configuration.md).

**Session** — one disposable browser instance: a managed container plus its
metadata (`AirlockSession` — `sessionId`, `browser`, `targetUrl`, `browserUrl`,
`createdAt`, `expiresAt`). It moves `running → expired | removed`.

**Session id** — a v4 UUID minted per session. It identifies the session in the
management API and doubles as the unguessable bearer behind the public
`capability link`.

**Browser kind** — one of the seven supported browsers: `chromium`, `chrome`,
`firefox`, `edge`, `brave`, `vivaldi`, `tor`. `chromium` is the default.

**Browser catalog** — the `BROWSER_CATALOG` map keying each `browser kind` to
its default Kasm image (e.g. `kasmweb/chromium:1.18.0`) and a
`container profile`. Backs the launch form and image resolution.

**Container profile** — the `ContainerImageProfile` describing how to run an
image: a `containerPort` (Kasm uses `6901`), `buildLaunchEnv` (maps a target
URL + VNC password to container env), and `streamUrl(host, hostPort)`. The only
shipped profile is `KASM_PROFILE`.

**Kasm** — the [Kasm Workspaces](https://kasmweb.com) container images Airlock
runs as browser sessions. They expose a browser over a VNC web stream on port
`6901` and take `LAUNCH_URL` / `VNC_PW` env.

**VNC password** — the password (`AIRLOCK_VNC_PASSWORD`, default `change-me`)
passed to the Kasm container as `VNC_PW` to gate the stream.

**`browserUrl`** — the direct stream URL of the running container,
`https://<host>:<hostPort>` (host from `AIRLOCK_SESSION_HOST`, port mapped by
Docker). It is the redirect target of the `capability link`.

**`sessionUrl`** — the public short URL `<AIRLOCK_PUBLIC_BASE_URL>/s/<sessionId>`
returned with every session. Resolving it `302`-redirects to `browserUrl`.

**Capability link** — the `/s/:sessionId` route. The session id is itself the
unguessable secret, so the link is auth-exempt and opened by plain browser
navigation that cannot carry an `Authorization` header.

**TTL** — a session's time-to-live in seconds. Defaults to `1800`
(`AIRLOCK_DEFAULT_TTL_SECONDS`), clamped to `60..86400` via `clampTtl` /
`resolveTtl`.

**Expiry** — the point `now >= expiresAt`, computed by the `session policy`
module (`isExpired`), not the route handlers. Reading an expired session stops
its container before returning `410 Gone`.

**Prune / cleanup worker** — `apps/worker`, an interval loop
(`AIRLOCK_CLEANUP_INTERVAL_MS`, min `5000`) that calls `POST /api/internal/prune`
so the API removes every expired managed container. The worker never touches
Docker directly.

**`SessionRuntime`** — the interface (`createSession`, `getSession`,
`listSessions`, `stopSession`, `pruneExpiredSessions`) that is the
API↔implementation seam. `DockerSessionRuntime` backs production;
`FakeSessionRuntime` backs tests. See [architecture.md](architecture.md).

**Session labels** — the `airlock.*` Docker labels (`airlock.managed`,
`airlock.session_id`, `airlock.browser`, `airlock.target_url`,
`airlock.created_at`, `airlock.expires_at`) that store session state on the
container itself. Encoded/decoded by the `session-labels` codec — Airlock keeps
no separate database.

**Managed container** — a Docker container Airlock created, marked
`airlock.managed=true`. Only managed containers are listed, inspected, or
pruned.

**Control plane** — the API process (`apps/api`). It is the sole module that
talks to Docker; clients and the worker reach Docker only through it.

**Host engine vs remote engine** — how the API reaches Docker. By default it
uses the local socket (`AIRLOCK_DOCKER_SOCKET_PATH`); setting
`AIRLOCK_DOCKER_HOST` (e.g. `tcp://host:2376`, optional TLS via
`AIRLOCK_DOCKER_CERT_PATH`) points it at a remote engine — what makes the
managed-PaaS deploy adapters viable.

**Deploy adapter / deployment contract** — the per-provider adapters under
`deploy/` (compose, k8s, vm, fly, render, railway) that all build the one shared
`Dockerfile` and satisfy the same contract (e.g. the `/healthz` probe). See
[deployment.md](deployment.md).

**Dashboard** — `apps/web`, the React + Vite SPA for launching, listing, and
stopping sessions. In production the API serves the built dashboard from one
origin. See [web.md](web.md).

**Extension** — `airlock-link-launcher`, the browser extension that right-click
launches a link into a fresh Airlock session via `POST /api/sessions` and opens
the returned `sessionUrl`. See [extensions.md](extensions.md).

**`ShmSize`** — the shared-memory size given to each browser container
(`AIRLOCK_SHM_SIZE_BYTES`, default 1 GB, clamped 256 MB–4 GB). Chromium-family
browsers need ample `/dev/shm`.

**`AutoRemove`** — the Docker `HostConfig.AutoRemove` flag set on every session
container so the engine deletes it on stop — disposability by default.

**`/healthz`** — the auth-exempt liveness/readiness probe returning
`{ ok: true }`. `/health` is a kept alias. Both are the deploy-contract health
check.
