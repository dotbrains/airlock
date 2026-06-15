import { describe, expect, it } from "vitest";
import { formatTimeRemaining } from "./time";

const now = new Date("2026-06-15T12:00:00.000Z").getTime();

describe("formatTimeRemaining", () => {
  it("formats hours and minutes when over an hour remains", () => {
    expect(formatTimeRemaining("2026-06-15T13:30:00.000Z", now)).toBe("1h 30m");
  });

  it("formats minutes and seconds under an hour", () => {
    expect(formatTimeRemaining("2026-06-15T12:12:30.000Z", now)).toBe("12m 30s");
  });

  it("formats seconds under a minute", () => {
    expect(formatTimeRemaining("2026-06-15T12:00:45.000Z", now)).toBe("45s");
  });

  it("reports expired once the deadline passes", () => {
    expect(formatTimeRemaining("2026-06-15T11:59:59.000Z", now)).toBe("expired");
  });

  it("treats an unparseable date as expired", () => {
    expect(formatTimeRemaining("not-a-date", now)).toBe("expired");
  });
});
