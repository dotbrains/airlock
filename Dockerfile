# Airlock control-plane image — the shared image every deploy/ adapter builds.
#
# It bundles all three workspaces (api, worker, shared) plus the compiled web
# dashboard. The same image runs either process; the command selects which:
#   API + dashboard : bun apps/api/dist/index.js   (default CMD)
#   cleanup worker  : bun apps/worker/dist/index.js
#
# The API still needs to reach a Docker engine to spawn browser containers —
# mount /var/run/docker.sock (host adapters) or set AIRLOCK_DOCKER_HOST (remote
# engine). See deploy/README.md for the full contract.

# ---- build stage: install everything and compile the workspaces ----
FROM oven/bun:1 AS builder
WORKDIR /app

# Install against the lockfile first for a cached dependency layer.
COPY package.json bun.lock tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY apps/web/package.json apps/web/
RUN bun install --frozen-lockfile

# Compile shared → api/worker → web, then fold the SPA build into the API's
# static directory so a single process serves both.
COPY . .
RUN bun run --filter @airlock/shared build \
  && bun run --filter @airlock/api build \
  && bun run --filter @airlock/worker build \
  && bun run --filter @airlock/web build \
  && cp -r apps/web/dist apps/api/dist/public

# ---- runtime stage: production deps + compiled output only ----
FROM oven/bun:1-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# curl backs the deploy-contract healthcheck (GET /healthz).
RUN apt-get update \
  && apt-get install --no-install-recommends -y curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Reinstall without dev dependencies; workspace package manifests must be
# present so bun resolves the workspace:* links.
COPY package.json bun.lock tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY apps/web/package.json apps/web/
RUN bun install --frozen-lockfile --production

# Compiled output (includes apps/api/dist/public, the bundled dashboard).
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/worker/dist apps/worker/dist

# Run unprivileged; the control plane needs no root inside the container.
RUN useradd --create-home --uid 10001 airlock && chown -R airlock:airlock /app
USER airlock

ENV AIRLOCK_PORT=8787
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${AIRLOCK_PORT}/healthz" || exit 1

CMD ["bun", "apps/api/dist/index.js"]
