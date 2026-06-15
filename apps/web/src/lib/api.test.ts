import { describe, expect, it, vi } from "vitest";
import { AirlockApiError, createAirlockClient } from "./api";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });

describe("createAirlockClient", () => {
  it("attaches a bearer token when configured", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ sessions: [] })
    );
    const client = createAirlockClient({ token: "secret", fetchImpl });

    await client.listSessions();

    const [, init] = fetchImpl.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBe("Bearer secret");
  });

  it("omits the auth header when no token is set", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ sessions: [] })
    );
    const client = createAirlockClient({ fetchImpl });

    await client.listSessions();

    const [, init] = fetchImpl.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.has("authorization")).toBe(false);
  });

  it("unwraps the sessions array from the list payload", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ sessions: [{ sessionId: "a" }, { sessionId: "b" }] })
    );
    const client = createAirlockClient({ fetchImpl });

    const sessions = await client.listSessions();
    expect(sessions.map((session) => session.sessionId)).toEqual(["a", "b"]);
  });

  it("posts the create body as JSON", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ sessionId: "new" }, 201)
    );
    const client = createAirlockClient({ fetchImpl });

    await client.createSession({ targetUrl: "https://example.com", browser: "firefox" });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("/api/sessions");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      targetUrl: "https://example.com",
      browser: "firefox"
    });
  });

  it("tolerates a 204 with no body on stop", async () => {
    const fetchImpl = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 204 })
    );
    const client = createAirlockClient({ fetchImpl });

    await expect(client.stopSession("abc")).resolves.toBeUndefined();
  });

  it("throws AirlockApiError carrying the status and server message", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ error: "Unauthorized." }, 401)
    );
    const client = createAirlockClient({ token: "wrong", fetchImpl });

    await expect(client.getMeta()).rejects.toMatchObject({
      name: "AirlockApiError",
      status: 401,
      message: "Unauthorized."
    });
    await expect(client.getMeta()).rejects.toBeInstanceOf(AirlockApiError);
  });

  it("strips a trailing slash from a custom base URL", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ sessions: [] })
    );
    const client = createAirlockClient({ baseUrl: "http://api.local/", fetchImpl });

    await client.listSessions();
    expect(fetchImpl.mock.calls[0][0]).toBe("http://api.local/api/sessions");
  });
});
