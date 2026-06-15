import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { discoverEnvFile } from "@airlock/shared";
import { createApp } from "./app";
import { loadConfig } from "./config";
import { DockerSessionRuntime } from "./docker-session-runtime";

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
const runtime = new DockerSessionRuntime({ config });
const app = createApp({
  config,
  sessionRuntime: runtime
});

app.listen(config.server.port, () => {
  process.stdout.write(`Airlock API listening on http://localhost:${config.server.port}\n`);
});
