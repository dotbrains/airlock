import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { discoverEnvFile } from "@airlock/shared";
import { createApp } from "./app";
import { loadConfig } from "./config";
import { DockerSessionRuntime } from "./docker-session-runtime";
import { logger } from "./logger";

const envFile = discoverEnvFile({
  envFileOverride: process.env.AIRLOCK_ENV_FILE,
  startDir: __dirname
});
if (envFile) {
  loadDotenv({ path: envFile });
}

const config = loadConfig();

// When AIRLOCK_WEB_DIR is unset, fall back to the dashboard bundle the
// production image copies next to the API build (dist/public, i.e. alongside
// this file). Local `bun dev` runs leave it absent and serve the SPA from Vite.
if (!config.server.webDir) {
  const bundledWebDir = path.resolve(__dirname, "public");
  if (existsSync(bundledWebDir)) {
    config.server.webDir = bundledWebDir;
  }
}

// Secure-by-default nudge: a token-less API bound beyond loopback is open to
// anyone who can reach the host. We warn rather than refuse so the local
// docker-compose flow (which binds 0.0.0.0 inside the container but only maps
// 127.0.0.1 on the host) keeps working.
const isLoopbackBind = ["127.0.0.1", "::1", "localhost"].includes(config.server.bindHost);
if (!config.auth.token && !isLoopbackBind) {
  logger.warn("auth.token_unset", {
    message:
      "AIRLOCK_API_TOKEN is unset and the API is not bound to loopback; the management API is unauthenticated. Set AIRLOCK_API_TOKEN before exposing Airlock."
  });
}
const runtime = new DockerSessionRuntime({ config });
const app = createApp({
  config,
  sessionRuntime: runtime
});

const server = app.listen(config.server.port, config.server.bindHost, () => {
  logger.info("api.listening", {
    host: config.server.bindHost,
    port: config.server.port
  });
});

const shutdown = (signal: string): void => {
  logger.info("api.shutdown", { signal });
  server.close(() => process.exit(0));
  // Don't hang forever if connections refuse to drain.
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
