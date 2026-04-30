import { describe, expect, it } from "vitest";
import {
  INTERNAL_PRUNE_PATH,
  INTERNAL_TOKEN_HEADER,
  InternalApiError,
  createInternalApiClient
} from "@airlock/shared";

const ok = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });

describe("internal api client", () => {
  it("posts to the prune path", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return ok({ pruned: 3 });
    }) as unknown as typeof fetch;

    const client = createInternalApiClient({
      baseUrl: "http://api.example/",
      fetchImpl: fakeFetch
    });

    const result = await client.prune();
    expect(result).toEqual({ pruned: 3 });
    expect(calls[0].url).toBe(`http://api.example${INTERNAL_PRUNE_PATH}`);
    expect(calls[0].init?.method).toBe("POST");
  });

  it("includes token header when provided", async () => {
    let captured: HeadersInit | undefined;
    const fakeFetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      captured = init?.headers;
      return ok({ pruned: 0 });
    }) as unknown as typeof fetch;

    const client = createInternalApiClient({
      baseUrl: "http://api.example",
      token: "secret",
      fetchImpl: fakeFetch
    });

    await client.prune();
    expect((captured as Record<string, string>)[INTERNAL_TOKEN_HEADER]).toBe("secret");
  });

  it("omits token header when no token provided", async () => {
    let captured: HeadersInit | undefined;
    const fakeFetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      captured = init?.headers;
      return ok({ pruned: 0 });
    }) as unknown as typeof fetch;

    const client = createInternalApiClient({
      baseUrl: "http://api.example",
      fetchImpl: fakeFetch
    });

    await client.prune();
    expect(captured).toBeUndefined();
  });

  it("treats missing pruned field as zero", async () => {
    const fakeFetch = (async () => ok({})) as unknown as typeof fetch;
    const client = createInternalApiClient({
      baseUrl: "http://api.example",
      fetchImpl: fakeFetch
    });
    expect(await client.prune()).toEqual({ pruned: 0 });
  });

  it("throws InternalApiError on non-2xx response", async () => {
    const fakeFetch = (async () =>
      new Response("nope", { status: 401 })) as unknown as typeof fetch;

    const client = createInternalApiClient({
      baseUrl: "http://api.example",
      fetchImpl: fakeFetch
    });

    await expect(client.prune()).rejects.toBeInstanceOf(InternalApiError);
  });
});
