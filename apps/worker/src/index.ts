import { config as loadDotenv } from "dotenv";
import {
  InternalApiError,
  createInternalApiClient,
  discoverEnvFile,
  toInteger
} from "@airlock/shared";

const envFile = discoverEnvFile({
  envFileOverride: process.env.AIRLOCK_ENV_FILE,
  startDir: __dirname
});
if (envFile) {
  loadDotenv({ path: envFile });
}

const cleanupIntervalMs = Math.max(5000, toInteger(process.env.AIRLOCK_CLEANUP_INTERVAL_MS, 30000));

const client = createInternalApiClient({
  baseUrl: process.env.AIRLOCK_API_BASE_URL ?? "http://localhost:8787",
  token: process.env.AIRLOCK_INTERNAL_TOKEN
});

const pruneOnce = async (): Promise<void> => {
  try {
    const { pruned } = await client.prune();
    process.stdout.write(`Airlock worker prune complete. pruned=${pruned}\n`);
  } catch (error) {
    if (error instanceof InternalApiError) {
      process.stderr.write(`Airlock worker prune failed (${error.status}): ${error.body}\n`);
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Airlock worker prune error: ${message}\n`);
  }
};

void pruneOnce();
const timer = setInterval(() => {
  void pruneOnce();
}, cleanupIntervalMs);

const shutdown = (signal: string): void => {
  process.stdout.write(`Airlock worker shutting down (${signal}).\n`);
  clearInterval(timer);
  process.exit(0);
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
