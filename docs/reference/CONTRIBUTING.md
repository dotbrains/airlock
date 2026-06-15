# Contributing to Airlock

Thanks for your interest in contributing to Airlock! This guide covers
everything you need to get started.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/airlock.git
   cd airlock
   ```
3. **Install** dependencies from the repo root (this installs every workspace):
   ```bash
   bun install
   ```
4. **Copy** the example environment file:
   ```bash
   cp .env.example .env
   ```
5. **Install** the pre-commit hook:
   ```bash
   bunx lefthook install
   ```
6. **Create a branch** for your work:
   ```bash
   git checkout -b fix/description-of-change
   ```

You also need a local Docker engine running — the API creates and removes
browser containers through it. There is no database; session state lives in
Docker container labels. See [installation.md](../installation.md) for the full
prerequisites.

## Branch Naming

Use descriptive branch names with a category prefix:

- `fix/` -- Bug fixes
- `feat/` -- New features
- `docs/` -- Documentation changes
- `refactor/` -- Code refactoring
- `test/` -- Test additions or fixes
- `ci/` -- CI and automation changes

## Build & Test Commands

```bash
bun run test            # Run the test suites (apps/api, apps/web)
bun run format:check    # Check formatting
bun run format          # Auto-fix formatting
bun run lint            # oxlint (correctness category)
bun run typecheck       # tsc --noEmit across every workspace
make check              # All quality gates, serial — the gate CI runs
```

Always run `make check` before submitting a PR. `make check` is the serial
union of `fmt-check`, `lint`, `typecheck`, `test`, and `build`. See
[development.md](../development.md) for the full breakdown.

## TypeScript Conventions

Airlock is a Bun + TypeScript monorepo (Bun 1.1+) with workspaces under
`apps/*` and `packages/*`.

### Type Checking

- TypeScript 5.6 runs in strict mode; `tsc --noEmit` is the typecheck gate.
- Prefer precise types on public functions and on the shared contract surface
  in `packages/shared`.
- Keep request and response shapes validated with the Zod schemas in
  `apps/api/schemas.ts`.

### Dependencies

- Keep runtime dependencies minimal: only what's truly needed.
- Prefer the standard library and existing shared helpers before adding a new
  dependency.
- Shared contracts belong in `packages/shared`, not duplicated across apps.

### Formatting

- Prettier 3 enforces formatting: `printWidth` 100, `semi` true,
  double quotes (`singleQuote` false), no trailing comma, 2-space indent.
- oxlint 0.15 enforces the `correctness` category as errors.
- Do not hand-format around Prettier; run `bun run format`.

### File Organization

- App code lives under `apps/<name>/`; shared contracts under
  `packages/shared/`.
- The API is the only module that talks to Docker; the worker only knows the
  public prune endpoint. Keep that boundary intact.
- New launch profiles, browser kinds, and label fields belong in
  `packages/shared`, behind the existing codecs.

## Testing Conventions

- Tests run with Vitest 2. `apps/web` adds `@testing-library/react` + `jsdom`.
- The key seam is `SessionRuntime`: the API depends on the interface, and two
  adapters keep it honest — `DockerSessionRuntime` in production and
  `FakeSessionRuntime` in tests. The suite creates **no** real containers.
- Put tests next to the code they exercise within each workspace.

Example test structure:

```ts
import { describe, expect, it } from "vitest";

import { clampTtlSeconds } from "@airlock/shared";

describe("clampTtlSeconds", () => {
  it("clamps below the minimum", () => {
    expect(clampTtlSeconds(10)).toBe(60);
  });
});
```

## Adding a New Endpoint

1. Add the route in `apps/api/app.ts`
2. Define request and response schemas in `apps/api/schemas.ts`
3. Add tests under `apps/api`
4. Update the [API Reference](../api.md)

## Commit Message Style

Airlock follows Conventional Commits:

```
fix: close stream on client disconnect
feat: add per-user session quotas
docs: document the AIRLOCK_DOCKER_HOST adapter path
```

Prefix with `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `ci:`, or
`chore:`. Keep the subject line under 72 characters, in the imperative mood,
and summarizing the **why** of the change. Never force-push `main`, and never
commit secrets or `.env` files.

## Pull Request Expectations

- **One concern per PR.** Keep changes focused -- a bug fix, a feature, a
  refactor. Not all three.
- **Tests required.** New features and bug fixes should include tests. See the
  testing conventions above.
- **Passing CI.** All PRs must pass CI before merge. CI runs `make check` plus
  a Docker build smoke test on Blacksmith runners, and a code-scanning workflow
  runs `actionlint` and `gitleaks`.
- **Description.** Briefly explain what the PR does and why. Link to any
  relevant issues.

## Issue Reporting

Use [GitHub Issues](https://github.com/dotbrains/airlock/issues) for bug
reports and feature requests. For security vulnerabilities, see
[SECURITY.md](SECURITY.md) — do not open a public issue for them.

## License

By contributing, you agree that your contributions will be licensed under the
[PolyForm Shield License 1.0.0](../../LICENSE).
