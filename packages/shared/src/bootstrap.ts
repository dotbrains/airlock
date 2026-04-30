import { existsSync } from "node:fs";
import path from "node:path";

export interface DiscoverEnvFileOptions {
  envFileOverride?: string;
  cwd?: string;
  startDir?: string;
}

export const discoverEnvFile = ({
  envFileOverride,
  cwd = process.cwd(),
  startDir
}: DiscoverEnvFileOptions = {}): string | null => {
  const candidates = [
    envFileOverride,
    path.resolve(cwd, ".env"),
    path.resolve(cwd, "../../.env"),
    startDir ? path.resolve(startDir, "../../../.env") : undefined
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
};

export const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

export const toInteger = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};
