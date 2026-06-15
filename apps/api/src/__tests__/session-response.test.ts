import { describe, expect, it } from "vitest";
import { AirlockConfig } from "../config";
import { toSessionResponse } from "../session-response";
import { makeTestConfig } from "./_config";
import { makeSession } from "./_fakes";

const config: AirlockConfig = makeTestConfig({
  server: {
    port: 8787,
    bindHost: "0.0.0.0",
    publicBaseUrl: "https://airlock.example.com",
    sessionHost: "localhost",
    trustProxyHops: 1
  }
});

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
