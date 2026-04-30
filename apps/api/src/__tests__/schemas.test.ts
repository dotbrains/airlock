import { describe, expect, it } from "vitest";
import { createSessionBodySchema } from "../schemas";

describe("createSessionBodySchema", () => {
  it("accepts valid http/https URLs", () => {
    expect(
      createSessionBodySchema.parse({
        targetUrl: "https://example.com"
      })
    ).toMatchObject({
      targetUrl: "https://example.com"
    });
  });

  it("rejects unsupported schemes", () => {
    const parsed = createSessionBodySchema.safeParse({
      targetUrl: "ftp://example.com"
    });
    expect(parsed.success).toBe(false);
  });
});
