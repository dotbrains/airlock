import { describe, expect, it } from "vitest";
import type { Response } from "express";
import { resolveOrRespond } from "../resolve-session";
import { createFakeSessionRuntime, makeSession } from "./_fakes";

const makeFakeResponse = () => {
  const r = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      r.statusCode = code;
      return r;
    },
    json(payload: unknown) {
      r.body = payload;
      return r;
    }
  };
  return r as unknown as Response & { statusCode: number; body: unknown };
};

describe("resolveOrRespond", () => {
  it("returns the session when active", async () => {
    const runtime = createFakeSessionRuntime({ initial: makeSession({ sessionId: "s-1" }) });
    const response = makeFakeResponse();
    const result = await resolveOrRespond(runtime, "s-1", response);
    expect(result?.sessionId).toBe("s-1");
    expect((response as unknown as { statusCode: number }).statusCode).toBe(0);
  });

  it("writes 404 when session is missing", async () => {
    const runtime = createFakeSessionRuntime({ initial: null });
    const response = makeFakeResponse();
    const result = await resolveOrRespond(runtime, "missing", response);
    expect(result).toBeNull();
    expect((response as unknown as { statusCode: number }).statusCode).toBe(404);
  });

  it("writes 410 and stops the session when expired", async () => {
    const expired = makeSession({
      sessionId: "s-1",
      expiresAt: new Date(Date.now() - 1000).toISOString()
    });
    const runtime = createFakeSessionRuntime({ initial: expired });
    const response = makeFakeResponse();
    const result = await resolveOrRespond(runtime, expired.sessionId, response);
    expect(result).toBeNull();
    expect((response as unknown as { statusCode: number }).statusCode).toBe(410);
    expect(runtime.stopped).toEqual(["s-1"]);
  });
});
