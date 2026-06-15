// Minimal structured logger: one JSON object per line on stdout/stderr, so
// logs are greppable and machine-parseable without pulling in a logging dep.

type LogLevel = "info" | "warn" | "error";

type Fields = Record<string, string | number | boolean | undefined>;

// Stay quiet under the test runner so structured logs don't clutter output.
const silenced = Boolean(process.env.VITEST) || process.env.NODE_ENV === "test";

const emit = (level: LogLevel, event: string, fields: Fields = {}): void => {
  if (silenced) {
    return;
  }
  const record = { level, event, ...fields };
  const line = `${JSON.stringify(record)}\n`;
  if (level === "error" || level === "warn") {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }
};

export const logger = {
  info: (event: string, fields?: Fields): void => emit("info", event, fields),
  warn: (event: string, fields?: Fields): void => emit("warn", event, fields),
  error: (event: string, fields?: Fields): void => emit("error", event, fields)
};
