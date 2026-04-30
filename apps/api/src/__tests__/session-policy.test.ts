import { describe, expect, it } from "vitest";
import {
  TTL_DEFAULT_SECONDS,
  TTL_MAX_SECONDS,
  TTL_MIN_SECONDS,
  clampTtl,
  expiresAt,
  isExpired,
  resolveTtl
} from "@airlock/shared";

describe("session policy", () => {
  it("clampTtl enforces bounds", () => {
    expect(clampTtl(0)).toBe(TTL_MIN_SECONDS);
    expect(clampTtl(TTL_MIN_SECONDS - 1)).toBe(TTL_MIN_SECONDS);
    expect(clampTtl(TTL_DEFAULT_SECONDS)).toBe(TTL_DEFAULT_SECONDS);
    expect(clampTtl(TTL_MAX_SECONDS)).toBe(TTL_MAX_SECONDS);
    expect(clampTtl(TTL_MAX_SECONDS + 1)).toBe(TTL_MAX_SECONDS);
  });

  it("expiresAt adds ttl seconds to createdAt", () => {
    const created = new Date("2026-04-30T00:00:00.000Z");
    expect(expiresAt(created, 60).toISOString()).toBe("2026-04-30T00:01:00.000Z");
    expect(expiresAt(created, 1800).toISOString()).toBe("2026-04-30T00:30:00.000Z");
  });

  it("resolveTtl returns clamped requested when present", () => {
    expect(resolveTtl({ requested: 120, fallback: TTL_DEFAULT_SECONDS })).toBe(120);
    expect(resolveTtl({ requested: 0, fallback: TTL_DEFAULT_SECONDS })).toBe(TTL_MIN_SECONDS);
    expect(resolveTtl({ requested: TTL_MAX_SECONDS + 1, fallback: TTL_DEFAULT_SECONDS })).toBe(
      TTL_MAX_SECONDS
    );
  });

  it("resolveTtl falls back when requested is undefined", () => {
    expect(resolveTtl({ fallback: TTL_DEFAULT_SECONDS })).toBe(TTL_DEFAULT_SECONDS);
    expect(resolveTtl({ requested: undefined, fallback: 600 })).toBe(600);
  });

  it("isExpired compares against now", () => {
    const now = new Date("2026-04-30T12:00:00.000Z");
    expect(isExpired({ expiresAt: "2026-04-30T11:59:59.000Z" }, now)).toBe(true);
    expect(isExpired({ expiresAt: "2026-04-30T12:00:00.000Z" }, now)).toBe(true);
    expect(isExpired({ expiresAt: "2026-04-30T12:00:01.000Z" }, now)).toBe(false);
  });
});
