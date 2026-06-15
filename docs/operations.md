# Operations

Runbooks for operating a running Airlock control plane. The control plane is
two processes — the API (`apps/api`, which also serves the dashboard) and the
cleanup worker (`apps/worker`) — plus a reachable Docker engine. There is no
database to back up; session state lives in container labels.

## Running the API and worker

The same image runs either process; the command selects which.

```bash
# API + dashboard
docker run --rm \
  -p 8787:8787 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e AIRLOCK_API_TOKEN="$(openssl rand -hex 16)" \
  -e AIRLOCK_INTERNAL_TOKEN="$(openssl rand -hex 16)" \
  airlock bun apps/api/dist/index.js

# Cleanup worker (share AIRLOCK_INTERNAL_TOKEN with the API)
docker run --rm \
  -e AIRLOCK_API_BASE_URL=http://api:8787 \
  -e AIRLOCK_INTERNAL_TOKEN=<same-as-api> \
  airlock bun apps/worker/dist/index.js
```

For local development, Docker Compose runs both from source:

```bash
docker compose -f deploy/docker-compose/docker-compose.yml up
```

The API needs to reach a Docker engine — a bind-mounted
`/var/run/docker.sock` (host adapters) or `AIRLOCK_DOCKER_HOST` (remote engine,
optionally with `AIRLOCK_DOCKER_CERT_PATH` for TLS). See
[deployment.md](deployment.md) for the provider matrix.

## Health probing

| Surface                      | Use                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------- |
| `GET /healthz` (auth-exempt) | Liveness probe; returns `{"ok":true}`. Backs the image `HEALTHCHECK`.           |
| `GET /health` (auth-exempt)  | Alias of `/healthz` for existing tooling.                                       |
| `GET /readyz` (auth-exempt)  | Readiness probe; pings the Docker engine. `200` when reachable, `503` when not. |

```bash
curl -fsS http://127.0.0.1:8787/healthz   # liveness — process up
curl -fsS http://127.0.0.1:8787/readyz    # readiness — engine reachable
```

`/healthz` is liveness-only: it means the API process is up but does **not**
check the Docker engine. `/readyz` is the engine-reachability probe — it
returns `{"ok":true,"engine":"reachable"}` when the engine responds to a ping
and `503` with `{"ok":false,"engine":"unreachable"}` otherwise. Point
deployment **liveness** probes at `/healthz` and **readiness** probes at
`/readyz`; a healthy `/healthz` with a failing `/readyz` points at engine
access (see [troubleshooting.md](troubleshooting.md)). Neither requires a
token.

## Metrics

`GET /metrics` exposes Prometheus text (Content-Type
`text/plain; version=0.0.4`). Unlike the probes it **requires** the bearer
token, so scrape it with the `Authorization` header:

```bash
curl -fsS -H "Authorization: Bearer $AIRLOCK_API_TOKEN" \
  http://127.0.0.1:8787/metrics
```

| Metric                                  | Type    | Meaning                     |
| --------------------------------------- | ------- | --------------------------- |
| `airlock_sessions_created_total`        | counter | Sessions created            |
| `airlock_sessions_stopped_total`        | counter | Sessions stopped (delete)   |
| `airlock_sessions_expired_total`        | counter | Sessions expired and pruned |
| `airlock_session_create_failures_total` | counter | Session creation failures   |
| `airlock_sessions_active`               | gauge   | Currently active sessions   |

## The prune / cleanup loop

The worker calls `POST /api/internal/prune` once on boot and then every
`AIRLOCK_CLEANUP_INTERVAL_MS` (minimum `5000`, default `30000`). The API
inspects managed containers and force-removes any past `expires_at`, returning
`{"pruned":N}`. Expiry is also enforced on read: `GET /api/sessions/:id` (and
`GET /s/:id`) returns `410` for an expired session and stops it immediately, so
a session never outlives its TTL even between prune ticks.

Tune the interval to trade promptness against engine load:

```bash
# Reap more aggressively (every 10s)
export AIRLOCK_CLEANUP_INTERVAL_MS=10000
```

Drive a single pass manually (useful for verifying the secret and engine
reachability):

```bash
curl -fsS -X POST \
  -H "x-airlock-internal-token: $AIRLOCK_INTERNAL_TOKEN" \
  http://127.0.0.1:8787/api/internal/prune
# {"pruned":3}
```

## Listing and terminating sessions

The management API is gated by the bearer token. List active sessions (newest
first):

```bash
curl -fsS -H "Authorization: Bearer $AIRLOCK_API_TOKEN" \
  http://127.0.0.1:8787/api/sessions
```

Inspect one (returns `410` if it has expired, `404` if unknown):

```bash
curl -fsS -H "Authorization: Bearer $AIRLOCK_API_TOKEN" \
  http://127.0.0.1:8787/api/sessions/<sessionId>
```

Terminate one (force-removes the container; `204` on success, `404` if gone):

```bash
curl -fsS -X DELETE -H "Authorization: Bearer $AIRLOCK_API_TOKEN" \
  http://127.0.0.1:8787/api/sessions/<sessionId>
```

## Token rotation

Two independent secrets:

- **`AIRLOCK_API_TOKEN`** — bearer for the dashboard/API. Rotate by setting the
  new value and restarting the API; dashboard users re-authenticate and any
  scripts update their `Authorization` header. The capability links
  (`/s/:id`) are unaffected — they are not gated by this token.
- **`AIRLOCK_INTERNAL_TOKEN`** — shared API↔worker prune secret. Rotate the API
  and worker **together**; a mismatch makes every prune return `401` and
  expired containers accumulate until reads reap them. Generate with
  `openssl rand -hex 16`.

## Choosing and pulling Kasm images

Each browser kind maps to a Kasm image (defaults pinned to `1.18.0`):
`chromium`, `chrome`, `firefox`, `edge`, `brave`, `vivaldi`, `tor`. Override a
tag per kind with `AIRLOCK_IMAGE_<BROWSER>`, e.g.:

```bash
export AIRLOCK_IMAGE_CHROMIUM=kasmweb/chromium:1.18.0
```

Pre-pull images on the engine to avoid first-session latency (a pull happens
implicitly on `createContainer` otherwise):

```bash
docker pull kasmweb/chromium:1.18.0
```

## Shared-memory tuning

Browsers are memory-hungry through `/dev/shm`; Airlock sets `ShmSize` from
`AIRLOCK_SHM_SIZE_BYTES` (clamped 256 MB–4 GB, default 1 GB). Raise it if
sessions crash rendering heavy pages, lower it to pack more sessions per host:

```bash
export AIRLOCK_SHM_SIZE_BYTES=2147483648   # 2 GB
```

## Per-session resource limits

Each browser container is launched with caps on memory, CPU, and PIDs. Tune
them to trade per-session headroom against density (set any to `0` to uncap):

```bash
export AIRLOCK_SESSION_MEMORY_BYTES=2147483648  # 2 GiB memory cap (default)
export AIRLOCK_SESSION_CPUS=2                    # 2 CPUs (default, -> NanoCpus)
export AIRLOCK_SESSION_PIDS_LIMIT=512            # 512 PIDs (default)
```

## Concurrency cap and rate limit

Bound load on `POST /api/sessions`:

```bash
export AIRLOCK_MAX_SESSIONS=25            # concurrent active sessions (0 = unlimited)
export AIRLOCK_RATE_LIMIT_WINDOW_MS=60000 # fixed window length
export AIRLOCK_RATE_LIMIT_MAX=30          # requests per IP per window (0 = disabled)
```

Creation past the cap returns `429`; over-limit requests return `429` with a
`Retry-After` header.

## Network isolation and egress proxy

By default sessions attach to a dedicated ICC-disabled bridge network so they
cannot reach each other. Optionally route all session egress through a proxy:

```bash
export AIRLOCK_NETWORK_ISOLATION=true   # dedicated bridge (default)
export AIRLOCK_NETWORK_NAME=airlock     # network name, created on demand
export AIRLOCK_EGRESS_PROXY=http://proxy:3128  # inject HTTP(S)_PROXY into containers
```

The bridge alone does not block the host, the LAN, or cloud metadata endpoints
— see [security.md](security.md#network-isolation).

## Structured logs

The API emits one JSON object per line. Events include `session.created`,
`session.stopped`, `session.pruned`, `session.create_failed`, `api.listening`,
`api.shutdown`, and `auth.token_unset`. Pipe them into your log aggregator and
filter on the event name, e.g.:

```bash
docker logs <api-container> | grep session.create_failed
```

## Behind a proxy / TLS

When the API is reachable beyond localhost, terminate TLS at a reverse proxy
and forward to port `8787`. Set `AIRLOCK_PUBLIC_BASE_URL` to the externally
visible origin so generated `/s/:id` links are correct, and
`AIRLOCK_SESSION_HOST` to the host clients use to reach browser containers.
The bearer token must be set in this posture — see [security.md](security.md).

## After a restart

The control plane is **stateless**. On restart the API holds no in-memory
session list — it reconstructs everything by inspecting managed containers
(`airlock.*` labels) on the next API call. To verify recovery after a restart
or unclean stop:

```bash
curl -fsS -H "Authorization: Bearer $AIRLOCK_API_TOKEN" \
  http://127.0.0.1:8787/api/sessions
```

Surviving containers reappear in the list; any that expired while the control
plane was down are reaped by the next prune tick (or on first read). No
recovery command is needed.
