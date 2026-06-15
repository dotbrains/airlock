# Quickstart

Use this page to get Airlock running locally and launch a first disposable
browser session.

## 1. Prerequisites

Airlock needs a local Docker engine and Bun:

- [Docker Desktop](https://www.docker.com/) or Docker Engine **running**.
  Airlock creates and removes browser containers through the Docker socket.
- [Bun](https://bun.sh) **1.1+** to run the monorepo.

See [installation.md](installation.md) for the full toolchain and verification
steps.

## 2. Install

Airlock is a Bun + TypeScript monorepo. Install all workspace dependencies from
the repo root:

```bash
git clone https://github.com/dotbrains/airlock.git
cd airlock
bun install
cp .env.example .env
```

The `.env` file is optional for local dev — every variable has a default. See
[configuration.md](configuration.md) for the full list.

## 3. Run Local Checks

Run the same quality gate CI runs:

```bash
make check
```

`make check` runs format-check, lint, type-check, tests, and build. See
[development.md](development.md) for each underlying script.

## 4. Start The Three Processes

Local dev runs as three processes — the API, the cleanup worker, and the Vite
dashboard — each in its own terminal:

```bash
bun run dev:api    # terminal 1 — session API on :8787
bun run dev:worker # terminal 2 — cleanup worker (prunes expired sessions)
bun run dev:web    # terminal 3 — dashboard on :5173
```

The dashboard dev server runs on <http://localhost:5173> and proxies `/api`
and `/s` to the API on `:8787`. There is no database — session state lives in
Docker container labels (the `airlock.*` prefix), so the control plane is
stateless.

## 5. Launch A Browser Session

Open <http://localhost:5173>. If you set `AIRLOCK_API_TOKEN`, enter it on the
login screen; for local dev leave it blank (the API is unauthenticated until
the token is set). Then:

1. Use the launch form to enter a target URL and pick a browser and lifetime.
2. Watch the session appear in the list and count down to its TTL.
3. Embed the live VNC stream in the viewer, or open it in a new tab.
4. Terminate the session when you are done — or let the worker reap it at
   expiry.

Behind the scenes the API pulls a [Kasm](https://kasmweb.com/) browser image,
starts a container with `AutoRemove` and `airlock.*` labels, and hands back a
session link. See [architecture.md](architecture.md) for the full lifecycle.

## 6. Run From The Shared Image (optional)

To run the whole stack — API, dashboard, and worker — from the shared Docker
image instead of three processes:

```bash
docker compose up
```

This builds the root image and serves everything on <http://localhost:8787>;
the API serves the built dashboard itself, so no separate Vite process runs.

## 7. Open Links By Right-Clicking (optional)

Load the [browser extension](extensions.md) to right-click any link and open it
in a fresh Airlock session, without touching the dashboard.

## 8. Choose The Next Guide

- Driving Airlock over HTTP: [api.md](api.md).
- Using the dashboard: [web.md](web.md).
- Configuring env and prerequisites: [configuration.md](configuration.md).
- Deploying beyond localhost: [deployment.md](deployment.md).
- Debugging a failure: [troubleshooting.md](troubleshooting.md).
