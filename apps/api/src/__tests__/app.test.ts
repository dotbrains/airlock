import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { AirlockConfig } from "../config";
import { makeTestConfig } from "./_config";
import { createFakeSessionRuntime } from "./_fakes";

const testConfig: AirlockConfig = makeTestConfig();

describe("Airlock API", () => {
  it("creates a session and returns the public launch URL", async () => {
    const app = createApp({
      config: testConfig,
      sessionRuntime: createFakeSessionRuntime()
    });

    const response = await request(app).post("/api/sessions").send({
      targetUrl: "https://example.com"
    });

    expect(response.status).toBe(201);
    expect(response.body.sessionUrl).toBe("http://localhost:8787/s/session-1");
  });

  it("rejects invalid target URLs", async () => {
    const app = createApp({
      config: testConfig,
      sessionRuntime: createFakeSessionRuntime()
    });

    const response = await request(app).post("/api/sessions").send({
      targetUrl: "ftp://example.com"
    });

    expect(response.status).toBe(400);
  });

  it("redirects session short links to the browser container URL", async () => {
    const app = createApp({
      config: testConfig,
      sessionRuntime: createFakeSessionRuntime()
    });

    const response = await request(app).get("/s/session-1");
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://localhost:6901");
  });

  it("lists active sessions with their public launch URLs", async () => {
    const app = createApp({
      config: testConfig,
      sessionRuntime: createFakeSessionRuntime()
    });

    const response = await request(app).get("/api/sessions");
    expect(response.status).toBe(200);
    expect(response.body.sessions).toHaveLength(1);
    expect(response.body.sessions[0].sessionUrl).toBe("http://localhost:8787/s/session-1");
  });

  it("answers /healthz without auth", async () => {
    const app = createApp({
      config: { ...testConfig, auth: { token: "secret" } },
      sessionRuntime: createFakeSessionRuntime()
    });

    const response = await request(app).get("/healthz");
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it("returns 200 from /readyz when the engine is reachable", async () => {
    const app = createApp({
      config: testConfig,
      sessionRuntime: createFakeSessionRuntime({ pingResult: true })
    });

    const response = await request(app).get("/readyz");
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it("returns 503 from /readyz when the engine is unreachable", async () => {
    const app = createApp({
      config: testConfig,
      sessionRuntime: createFakeSessionRuntime({ pingResult: false })
    });

    const response = await request(app).get("/readyz");
    expect(response.status).toBe(503);
    expect(response.body.ok).toBe(false);
  });

  it("rejects session creation once the concurrent cap is reached", async () => {
    const cappedConfig: AirlockConfig = {
      ...testConfig,
      limits: { ...testConfig.limits, maxSessions: 1 }
    };
    // The fake reports one active session, so a second create is over the cap.
    const app = createApp({
      config: cappedConfig,
      sessionRuntime: createFakeSessionRuntime()
    });

    const response = await request(app)
      .post("/api/sessions")
      .send({ targetUrl: "https://example.com" });
    expect(response.status).toBe(429);
  });

  it("extends a session's TTL via PATCH", async () => {
    const app = createApp({
      config: testConfig,
      sessionRuntime: createFakeSessionRuntime()
    });

    const response = await request(app).patch("/api/sessions/session-1").send({ ttlSeconds: 600 });
    expect(response.status).toBe(200);
    expect(response.body.sessionId).toBe("session-1");
  });

  it("returns 404 when extending an unknown session", async () => {
    const app = createApp({
      config: testConfig,
      sessionRuntime: createFakeSessionRuntime({ initial: null })
    });

    const response = await request(app).patch("/api/sessions/nope").send({ ttlSeconds: 600 });
    expect(response.status).toBe(404);
  });

  it("rejects an invalid extend body", async () => {
    const app = createApp({
      config: testConfig,
      sessionRuntime: createFakeSessionRuntime()
    });

    const response = await request(app).patch("/api/sessions/session-1").send({ ttlSeconds: 5 });
    expect(response.status).toBe(400);
  });

  it("pulls browser images on demand", async () => {
    const app = createApp({
      config: testConfig,
      sessionRuntime: createFakeSessionRuntime()
    });

    const response = await request(app).post("/api/images/pull");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.images)).toBe(true);
  });

  it("serves Prometheus metrics", async () => {
    const app = createApp({
      config: testConfig,
      sessionRuntime: createFakeSessionRuntime()
    });

    const response = await request(app).get("/metrics");
    expect(response.status).toBe(200);
    expect(response.text).toContain("airlock_sessions_active 1");
    expect(response.text).toContain("airlock_sessions_created_total");
  });

  describe("with an API token configured", () => {
    const securedConfig: AirlockConfig = { ...testConfig, auth: { token: "secret" } };

    it("rejects management requests without a bearer token", async () => {
      const app = createApp({
        config: securedConfig,
        sessionRuntime: createFakeSessionRuntime()
      });

      const response = await request(app).get("/api/sessions");
      expect(response.status).toBe(401);
    });

    it("rejects a wrong bearer token", async () => {
      const app = createApp({
        config: securedConfig,
        sessionRuntime: createFakeSessionRuntime()
      });

      const response = await request(app).get("/api/sessions").set("authorization", "Bearer wrong");
      expect(response.status).toBe(401);
    });

    it("accepts the correct bearer token", async () => {
      const app = createApp({
        config: securedConfig,
        sessionRuntime: createFakeSessionRuntime()
      });

      const response = await request(app)
        .get("/api/sessions")
        .set("authorization", "Bearer secret");
      expect(response.status).toBe(200);
    });

    it("leaves the /s/:id capability link open", async () => {
      const app = createApp({
        config: securedConfig,
        sessionRuntime: createFakeSessionRuntime()
      });

      const response = await request(app).get("/s/session-1");
      expect(response.status).toBe(302);
    });
  });
});
