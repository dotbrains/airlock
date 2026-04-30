import { describe, expect, it } from "vitest";
import {
  BROWSER_CATALOG,
  BROWSER_KINDS,
  defaultBrowserImage,
  isBrowserKind,
  toBrowserKind
} from "@airlock/shared";

describe("browser catalog", () => {
  it("BROWSER_KINDS matches catalog keys", () => {
    expect([...BROWSER_KINDS].sort()).toEqual(Object.keys(BROWSER_CATALOG).sort());
  });

  it("isBrowserKind narrows known values", () => {
    expect(isBrowserKind("chromium")).toBe(true);
    expect(isBrowserKind("firefox")).toBe(true);
    expect(isBrowserKind("safari")).toBe(false);
    expect(isBrowserKind(undefined)).toBe(false);
    expect(isBrowserKind(123)).toBe(false);
  });

  it("toBrowserKind falls back when invalid", () => {
    expect(toBrowserKind("safari", "chromium")).toBe("chromium");
    expect(toBrowserKind("firefox", "chromium")).toBe("firefox");
    expect(toBrowserKind(undefined, "chromium")).toBe("chromium");
  });

  it("defaultBrowserImage returns Kasm image", () => {
    expect(defaultBrowserImage("chromium")).toMatch(/^kasmweb\/chromium:/);
  });
});
