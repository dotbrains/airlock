import type { AirlockSession } from "./index";

export const TTL_MIN_SECONDS = 60;
export const TTL_MAX_SECONDS = 86_400;
export const TTL_DEFAULT_SECONDS = 1_800;

export const clampTtl = (seconds: number): number =>
  Math.max(TTL_MIN_SECONDS, Math.min(TTL_MAX_SECONDS, seconds));

export interface ResolveTtlInput {
  requested?: number;
  fallback: number;
}

export const resolveTtl = ({ requested, fallback }: ResolveTtlInput): number =>
  clampTtl(requested ?? fallback);

export const expiresAt = (createdAt: Date, ttlSeconds: number): Date =>
  new Date(createdAt.getTime() + ttlSeconds * 1000);

export const isExpired = (
  session: Pick<AirlockSession, "expiresAt">,
  now: Date = new Date()
): boolean => new Date(session.expiresAt).getTime() <= now.getTime();
