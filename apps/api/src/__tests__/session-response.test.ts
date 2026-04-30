import { describe, expect, it } from "vitest";
import { AirlockConfig } from "../config";
import { toSessionResponse } from "../session-response";
import { makeSession } from "./_fakes";

const config: AirlockConfig = {
  server: {
    port: 8787,
    publicBaseUrl: "https://airlock.example.com",
    sessionHost: "localhost"
  },
  sessionDefaults: { ttlSeconds: 1800, browser: "chromium" },
  containerLaunch: {
    dockerSocketPath: "/var/run/docker.sock",
    shmSizeBytes: 1073741824,
    vncPassword: "pw",
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
  internal: {}
};

describe("toSessionResponse", () => {
  it("appends sessionUrl built from publicBaseUrl + sessionId", () => {
    const session = makeSession({ sessionId: "abc-123" });
    const body = toSessionResponse(session, config);
    expect(body.sessionUrl).toBe("https://airlock.example.com/s/abc-123");
  });

  it("preserves the original session fields", () => {
    const session = makeSession({ sessionId: "abc-123", browserUrl: "https://localhost:32792" });
    const body = toSessionResponse(session, config);
    expect(body).toMatchObject(session);
  });

  it("handles a publicBaseUrl with a path prefix", () => {
    const prefixed: AirlockConfig = {
      ...config,
      server: { ...config.server, publicBaseUrl: "https://airlock.example.com/airlock" }
    };
    const session = makeSession({ sessionId: "abc-123" });
    expect(toSessionResponse(session, prefixed).sessionUrl).toBe(
      "https://airlock.example.com/s/abc-123"
    );
  });
});
