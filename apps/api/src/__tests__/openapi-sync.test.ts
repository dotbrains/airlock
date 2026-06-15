import { readFileSync } from "node:fs";
import path from "node:path";
import { BROWSER_KINDS, TTL_MAX_SECONDS, TTL_MIN_SECONDS } from "@airlock/shared";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

// Guards docs/openapi.yaml against silent drift from the code's actual
// contracts. It is not a full generator, but it pins the dynamic surfaces
// (browser catalog, TTL bounds, route table) that are easiest to forget.
const specPath = path.resolve(process.cwd(), "../../docs/openapi.yaml");
const spec = parse(readFileSync(specPath, "utf8")) as {
  paths: Record<string, Record<string, unknown>>;
  components: {
    schemas: {
      BrowserKind: { enum: string[] };
      CreateSessionRequest: { properties: { ttlSeconds: { minimum: number; maximum: number } } };
      ExtendSessionRequest: { properties: { ttlSeconds: { minimum: number; maximum: number } } };
    };
  };
};

describe("openapi.yaml stays in sync with the code", () => {
  it("lists exactly the supported browser kinds", () => {
    expect([...spec.components.schemas.BrowserKind.enum].sort()).toEqual([...BROWSER_KINDS].sort());
  });

  it("uses the shared TTL bounds on the create and extend bodies", () => {
    for (const schema of ["CreateSessionRequest", "ExtendSessionRequest"] as const) {
      const ttl = spec.components.schemas[schema].properties.ttlSeconds;
      expect(ttl.minimum).toBe(TTL_MIN_SECONDS);
      expect(ttl.maximum).toBe(TTL_MAX_SECONDS);
    }
  });

  it("documents every implemented route", () => {
    const expectedPaths = [
      "/healthz",
      "/health",
      "/readyz",
      "/metrics",
      "/api/meta",
      "/api/sessions",
      "/api/sessions/{sessionId}",
      "/api/images/pull",
      "/api/internal/prune",
      "/s/{sessionId}"
    ];
    for (const route of expectedPaths) {
      expect(spec.paths).toHaveProperty([route]);
    }
  });

  it("documents the methods on the session collection and item paths", () => {
    expect(Object.keys(spec.paths["/api/sessions"])).toEqual(
      expect.arrayContaining(["get", "post"])
    );
    expect(Object.keys(spec.paths["/api/sessions/{sessionId}"])).toEqual(
      expect.arrayContaining(["get", "patch", "delete"])
    );
  });
});
