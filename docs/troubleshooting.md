# Troubleshooting

Common local, runtime, and CI failures and how to resolve them.

## Local checks

**`make check` fails.** The aggregate gate runs `fmt-check`, `lint`,
`typecheck`, `test`, and `build` (mirrored by the `lefthook.yml` pre-commit
hook). Run `make check` for the exact serial suite CI uses, or the individual
steps to localize the failure:

```bash
bun run format:check   # prettier
bun run lint           # oxlint (correctness category)
bun run typecheck      # tsc --noEmit across all workspaces
bun run test           # vitest in apps/api
bun run build          # compile all workspaces
```

**The pre-commit hook is slow or out of date.** `lefthook` runs the gate in
parallel at commit time. Reinstall it with `bunx lefthook install` if the hook
stopped firing.

## Runtime

**The session stream iframe is blank or empty.** The container serves its VNC
stream over **self-signed TLS** at `https://<AIRLOCK_SESSION_HOST>:<port>`. The
browser blocks the untrusted certificate inside an embedded frame. Open the
`browserUrl` in a new tab once and accept the certificate warning; the
embedded view works afterward.

**The dashboard or API returns `401`.** `AIRLOCK_API_TOKEN` is set but the
request carried a missing or wrong bearer token. Send
`Authorization: Bearer <AIRLOCK_API_TOKEN>`, or unset the token for
loopback-only development (the guard becomes a no-op). The token is compared in
constant time, so a near-miss still fails.

**The worker logs `prune failed (401)`.** The worker's `AIRLOCK_INTERNAL_TOKEN`
does not match the API's. They are an independent secret from
`AIRLOCK_API_TOKEN` and must be equal across both processes. Fix the mismatch
and restart; until then expired containers are only reaped on read (`410`), not
by the loop.

**`Unable to map browser container to a host port.`** The engine started the
container but published no host port for `6901/tcp`. Causes: ephemeral host
ports exhausted, a daemon-level port-binding restriction, or the engine under
resource pressure. Check `docker ps`/`docker info`, free ports, and retry.

**Cannot reach Docker / session creation hangs or errors.** The API cannot
talk to the engine. Probe `GET /readyz` — it returns `503` with
`{"ok":false,"engine":"unreachable"}` when the engine is unreachable (`/healthz`
stays green regardless, since it only checks the API process). For the
host-socket path, confirm `AIRLOCK_DOCKER_SOCKET_PATH` (default
`/var/run/docker.sock`) is correct and bind-mounted. For a remote engine,
confirm `AIRLOCK_DOCKER_HOST` is reachable and, for `https://`, that
`AIRLOCK_DOCKER_CERT_PATH` points at a directory holding
`ca.pem`/`cert.pem`/`key.pem`.

**`/readyz` is 503 with the socket mounted (permission denied).** The image
runs as non-root (UID `10001`), which cannot read a `root:docker` socket unless
it shares the socket's group. Read the socket's group id with
`stat -c '%g' "$AIRLOCK_DOCKER_SOCKET_PATH"` (defaults to `/var/run/docker.sock`;
it is `0` on Docker Desktop). In the Compose adapters set `DOCKER_GID` to that
value so `group_add` grants access; for `docker run`, pass the numeric id as
`--group-add <gid>`.

**Image pull failures on first session.** The configured Kasm tag does not
exist or is unreachable. Verify `AIRLOCK_IMAGE_<BROWSER>` (defaults pin
`kasmweb/<kind>:1.18.0`) and pre-pull it: `docker pull kasmweb/chromium:1.18.0`.

**Port 8787 already in use.** Another process holds the API port. Change it
with `AIRLOCK_PORT`, and update `AIRLOCK_PUBLIC_BASE_URL` and the published
container port mapping to match.

**Sessions vanish on their own.** Expected — sessions are disposable. A session
is removed when its TTL elapses (default 1800s, clamped 60–86400): reading it
returns `410` and stops it, and the worker prunes expired containers every
`AIRLOCK_CLEANUP_INTERVAL_MS`. Containers also use `AutoRemove`, so a stopped
container disappears entirely. Raise `AIRLOCK_DEFAULT_TTL_SECONDS` or pass a
larger `ttlSeconds` on `POST /api/sessions` for longer-lived sessions.

## Dashboard build

**The API does not serve the dashboard.** In production the API serves the
built SPA from `AIRLOCK_WEB_DIR` (the image points this at `dist/public`
automatically). If the directory is missing or unset, the API serves only the
JSON routes. Build the dashboard (`bun run --filter @airlock/web build`) or
point `AIRLOCK_WEB_DIR` at an existing build.

**The Vite dev server can't reach the API.** Run `bun run dev:api` alongside
`bun run dev:web`; the dev server on `:5173` proxies `/api` and `/s` to
`:8787`. See [configuration.md](configuration.md).

## CI

**CI fails the `check` job.** CI runs `make check`. Reproduce locally with the
same command and fix the first failing step (format, lint, typecheck, test, or
build) before pushing. The pre-commit hook catches most of these before they
reach CI; run `bunx lefthook install` if it is not firing.
