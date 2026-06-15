import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { AirlockConfig } from "../config";
import { createFakeSessionRuntime } from "./_fakes";

const testConfig: AirlockConfig = {
  server: {
    port: 8787,
    publicBaseUrl: "http://localhost:8787",
    sessionHost: "localhost"
  },
  sessionDefaults: {
    ttlSeconds: 1800,
    browser: "chromium"
  },
  containerLaunch: {
    dockerSocketPath: "/var/run/docker.sock",
    shmSizeBytes: 1073741824,
    vncPassword: "change-me",
    browserImages: {
      chromium: "kasmweb/chromium:1.18.0",
      chrome: "kasmweb/chrome:1.18.0",
      firefox: "kasmweb/firefox:1.18.0",
      edge: "kasmweb/edge:1.18.0",
      brave: "kasmweb/brave:1.18.0",
      vivaldi: "kasmweb/vivaldi:1.18.0",
      tor: "kasmweb/tor-browser:1.18.0"
    }
  },
  auth: {},
  internal: {}
};

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
