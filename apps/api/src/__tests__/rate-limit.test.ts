import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { createRateLimit } from "../rate-limit";

const makeReqRes = (ip: string) => {
  const headers: Record<string, string> = {};
  const response = {
    statusCode: 0,
    body: undefined as unknown,
    setHeader: (key: string, value: string) => {
      headers[key] = value;
    },
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(payload: unknown) {
      response.body = payload;
      return response;
    }
  };
  return {
    request: { ip } as unknown as Request,
    response: response as unknown as Response & { statusCode: number; body: unknown },
    headers
  };
};

describe("createRateLimit", () => {
  it("allows up to max requests then returns 429", () => {
    const limiter = createRateLimit({ windowMs: 1000, max: 2 }, () => 1000);
    const next = vi.fn() as unknown as NextFunction;

    for (let i = 0; i < 2; i += 1) {
      const { request, response } = makeReqRes("1.1.1.1");
      limiter(request, response, next);
    }
    expect(next).toHaveBeenCalledTimes(2);

    const { request, response } = makeReqRes("1.1.1.1");
    limiter(request, response, next);
    expect(response.statusCode).toBe(429);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("tracks clients independently by IP", () => {
    const limiter = createRateLimit({ windowMs: 1000, max: 1 }, () => 1000);
    const next = vi.fn() as unknown as NextFunction;

    const a = makeReqRes("1.1.1.1");
    limiter(a.request, a.response, next);
    const b = makeReqRes("2.2.2.2");
    limiter(b.request, b.response, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(b.response.statusCode).toBe(0);
  });

  it("resets after the window elapses", () => {
    let now = 1000;
    const limiter = createRateLimit({ windowMs: 1000, max: 1 }, () => now);
    const next = vi.fn() as unknown as NextFunction;

    const first = makeReqRes("1.1.1.1");
    limiter(first.request, first.response, next);
    const blocked = makeReqRes("1.1.1.1");
    limiter(blocked.request, blocked.response, next);
    expect(blocked.response.statusCode).toBe(429);

    now = 2500; // past the window
    const after = makeReqRes("1.1.1.1");
    limiter(after.request, after.response, next);
    expect(after.response.statusCode).toBe(0);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("is a no-op when max is 0", () => {
    const limiter = createRateLimit({ windowMs: 1000, max: 0 });
    const next = vi.fn() as unknown as NextFunction;
    for (let i = 0; i < 5; i += 1) {
      const { request, response } = makeReqRes("1.1.1.1");
      limiter(request, response, next);
    }
    expect(next).toHaveBeenCalledTimes(5);
  });
});
