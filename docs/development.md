# Development

This page is for people contributing to Airlock itself.

## Environment

Airlock is a Bun + TypeScript monorepo. Install every workspace from the root
and copy the example env:

```bash
bun install
cp .env.example .env
```

You also need a local Docker engine running — the API creates and removes
browser containers through it. There is no database; session state lives in
Docker container labels. See [installation.md](installation.md) for the full
prerequisites.

## The quality gate

Run the same gate CI runs:

```bash
make check
```

`make check` is the serial union of these targets, each delegating to a root
`package.json` script:

| Target      | What it checks                                             |
| ----------- | ---------------------------------------------------------- |
| `fmt-check` | `prettier --check` across `ts,tsx,js,json,html,css,md,yml` |
| `lint`      | `oxlint apps packages` (correctness category)              |
| `typecheck` | `tsc --noEmit` across every workspace                      |
| `test`      | `vitest run` in `apps/api` and `apps/web`                  |
| `build`     | `tsc` per workspace; `apps/web` runs `tsc && vite build`   |

Use `make fmt` (or `bun run format`) to write formatting fixes with Prettier.

CI runs the same `make check` on a Blacksmith runner
(`blacksmith-4vcpu-ubuntu-2404`), plus a `docker-build` job that smoke-builds
the shared deploy image. A separate code-scanning workflow runs `actionlint`
and `gitleaks`.

### Pre-commit hook

The repo wires the same checks into a pre-commit hook via
[lefthook](https://github.com/evilmartians/lefthook). Install it once:

```bash
bunx lefthook install
```

The hook runs format-check, lint, typecheck, test, and build in **parallel**
for a faster commit-time loop. Run `make check` for the exact serial suite CI
uses.

### Tooling

- **oxlint 0.15** — plugins `typescript`/`unicorn`/`oxc`, with
  `categories.correctness = error`.
- **Prettier 3** — `printWidth 100`, `semi true`, `singleQuote false`,
  `trailingComma none`, `tabWidth 2`.
- **TypeScript 5.6** — `tsc --noEmit` for type-checking; each library workspace
  emits CommonJS to `dist/` on build.
- **Vitest 2** — `apps/web` adds `@testing-library/react` + `jsdom`.

## Running the dev servers

Local dev runs as three processes, each in its own terminal:

```bash
bun run dev:api    # API on :8787 (bun --watch)
bun run dev:worker # cleanup worker (bun --watch)
bun run dev:web    # dashboard on :5173 (Vite)
```

The Vite dev server proxies `/api` and `/s` to the API on `:8787`, so the
dashboard talks to a real API in development. In production the API serves the
built dashboard from `dist/public`, so only the API and worker run — see
[web.md](web.md) and [deployment.md](deployment.md).

## Code organization

Airlock splits responsibilities across apps and a shared package:

### `apps/api` — session API

| Module                      | Role                                                 |
| --------------------------- | ---------------------------------------------------- |
| `index.ts`                  | Process entry: load config, wire the runtime, listen |
| `app.ts`                    | Express app, routes, dashboard static serving        |
| `config.ts`                 | `loadConfig` → `AirlockConfig` from env              |
| `auth.ts`                   | `createBearerAuth` constant-time token guard         |
| `schemas.ts`                | Zod request/response schemas                         |
| `docker-session-runtime.ts` | `DockerSessionRuntime` (prod adapter, dockerode)     |
| `docker-errors.ts`          | Docker error normalization                           |
| `resolve-session.ts`        | `/s/:id` label lookup → redirect resolution          |
| `session-response.ts`       | Session JSON shaping                                 |

### `packages/shared` — contracts

| Module                 | Role                                              |
| ---------------------- | ------------------------------------------------- |
| `browser-catalog.ts`   | Supported browser kinds and their Kasm images     |
| `container-profile.ts` | Container launch profile (image, ports, shm, env) |
| `session-policy.ts`    | TTL clamping and session policy rules             |
| `session-labels.ts`    | Encode/decode the `airlock.*` label codec         |
| `internal-api.ts`      | Internal API client (worker → API prune)          |
| `bootstrap.ts`         | `discoverEnvFile` and shared boot helpers         |
| `index.ts`             | Public contract surface                           |

### `apps/worker` — cleanup loop

A small interval loop: every `AIRLOCK_CLEANUP_INTERVAL_MS` it calls
`POST /api/internal/prune` on the API (via the shared internal-api client),
which lists managed containers and removes the expired ones. The worker never
touches Docker directly.

### `apps/web` — dashboard SPA

`App.tsx` and `main.tsx` plus `styles.css` mount the SPA. Logic lives under
`lib/` (`api.ts`, `time.ts`, `token-storage.ts`) and components under
`components/` (`LoginScreen`, `LaunchForm`, `SessionList`, `SessionViewer`).

## Testing

Tests run with Vitest. Two workspaces have real suites:

- **`apps/api`** — 56 tests across 11 files exercising the app and auth, the
  Docker runtime through a `FakeDocker`, schemas, session policy, session
  labels, container profile, the internal API, and session resolution.
- **`apps/web`** — 14 tests across `lib/api`, `lib/time`, and the
  `LaunchForm` component, using `@testing-library/react` + `jsdom`.

`packages/shared` and `apps/worker` have no real test suites (their `test`
script is a no-op).

The key test seam is `SessionRuntime`: the API depends on the interface, and
two adapters keep it honest — `DockerSessionRuntime` in production and
`FakeSessionRuntime` in tests — so the suite creates no real containers. See
[architecture.md](architecture.md#module-map).

## Building

Each workspace builds with `tsc` and emits CommonJS to `dist/`. `apps/web`
runs `tsc --noEmit && vite build`. The production image copies
`apps/web/dist` into `apps/api/dist/public`, and the API serves it as the
dashboard.

## Documentation changes

Update the most specific doc page first. If a change affects how a new
developer starts, also update [README.md](../README.md). Use Mermaid for
diagrams; avoid box-drawing ASCII diagrams in Markdown. Cross-link sibling
guides: [quickstart.md](quickstart.md), [installation.md](installation.md),
[configuration.md](configuration.md), [architecture.md](architecture.md),
[api.md](api.md), [web.md](web.md), [deployment.md](deployment.md), and
[troubleshooting.md](troubleshooting.md).
