import { describe, expect, it } from "vitest";
import {
  SESSION_LABEL_KEYS,
  decodeSessionLabels,
  encodeSessionLabels,
  isManagedLabels
} from "@airlock/shared";

describe("session labels codec", () => {
  const createdAt = new Date("2026-04-30T12:00:00.000Z");
  const expiresAt = new Date("2026-04-30T12:30:00.000Z");

  it("round-trips an encoded session", () => {
    const labels = encodeSessionLabels({
      sessionId: "s1",
      browser: "firefox",
      targetUrl: "https://example.com",
      createdAt,
      expiresAt
    });

    expect(labels[SESSION_LABEL_KEYS.managed]).toBe("true");
    const decoded = decodeSessionLabels(labels, "chromium");
    expect(decoded).toEqual({
      sessionId: "s1",
      browser: "firefox",
      targetUrl: "https://example.com",
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString()
    });
  });

  it("isManagedLabels rejects unmanaged labels", () => {
    expect(isManagedLabels({})).toBe(false);
    expect(isManagedLabels(undefined)).toBe(false);
    expect(isManagedLabels({ [SESSION_LABEL_KEYS.managed]: "false" })).toBe(false);
    expect(isManagedLabels({ [SESSION_LABEL_KEYS.managed]: "true" })).toBe(true);
  });

  it("decodeSessionLabels returns null when missing managed flag", () => {
    expect(decodeSessionLabels({ [SESSION_LABEL_KEYS.sessionId]: "s1" }, "chromium")).toBeNull();
  });

  it("decodeSessionLabels returns null when sessionId or targetUrl missing", () => {
    expect(
      decodeSessionLabels(
        {
          [SESSION_LABEL_KEYS.managed]: "true",
          [SESSION_LABEL_KEYS.targetUrl]: "https://example.com"
        },
        "chromium"
      )
    ).toBeNull();
  });

  it("decodeSessionLabels returns null when createdAt or expiresAt missing", () => {
    expect(
      decodeSessionLabels(
        {
          [SESSION_LABEL_KEYS.managed]: "true",
          [SESSION_LABEL_KEYS.sessionId]: "s1",
          [SESSION_LABEL_KEYS.targetUrl]: "https://example.com",
          [SESSION_LABEL_KEYS.createdAt]: createdAt.toISOString()
        },
        "chromium"
      )
    ).toBeNull();
  });

  it("decodeSessionLabels returns null when expiresAt is unparseable", () => {
    const labels = encodeSessionLabels({
      sessionId: "s1",
      browser: "chromium",
      targetUrl: "https://example.com",
      createdAt,
      expiresAt
    });
    labels[SESSION_LABEL_KEYS.expiresAt] = "not-a-date";
    expect(decodeSessionLabels(labels, "chromium")).toBeNull();
  });

  it("decodeSessionLabels falls back to default browser on unknown value", () => {
    const labels = encodeSessionLabels({
      sessionId: "s1",
      browser: "firefox",
      targetUrl: "https://example.com",
      createdAt,
      expiresAt
    });
    labels[SESSION_LABEL_KEYS.browser] = "netscape";
    expect(decodeSessionLabels(labels, "chromium")?.browser).toBe("chromium");
  });
});
