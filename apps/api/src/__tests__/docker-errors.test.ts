import { describe, expect, it } from "vitest";
import { isContainerNotFound } from "../docker-errors";

describe("isContainerNotFound", () => {
  it("matches dockerode 404 status", () => {
    expect(isContainerNotFound({ statusCode: 404, reason: "no such container" })).toBe(true);
  });

  it("matches reason field", () => {
    expect(isContainerNotFound({ statusCode: 500, reason: "No such container: abc" })).toBe(true);
  });

  it("matches message field", () => {
    expect(isContainerNotFound(new Error("(HTTP code 404) no such container - foo"))).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isContainerNotFound(new Error("ECONNREFUSED"))).toBe(false);
    expect(isContainerNotFound({ statusCode: 500, reason: "internal" })).toBe(false);
    expect(isContainerNotFound(undefined)).toBe(false);
    expect(isContainerNotFound(null)).toBe(false);
    expect(isContainerNotFound("oops")).toBe(false);
  });
});
