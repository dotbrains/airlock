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
const runtime = new DockerSessionRuntime({ config });
const app = createApp({
  config,
  sessionRuntime: runtime
});

app.listen(config.server.port, () => {
  process.stdout.write(`Airlock API listening on http://localhost:${config.server.port}\n`);
});
