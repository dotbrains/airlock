import { describe, expect, it } from "vitest";
import { BROWSER_KINDS, KASM_PROFILE, browserProfile } from "@airlock/shared";

describe("container image profile", () => {
  it("KASM_PROFILE exposes Kasm port and url scheme", () => {
    expect(KASM_PROFILE.containerPort).toBe(6901);
    expect(KASM_PROFILE.streamUrl("localhost", 32792)).toBe("https://localhost:32792");
  });

  it("KASM_PROFILE buildLaunchEnv emits VNC_PW and LAUNCH_URL", () => {
    expect(
      KASM_PROFILE.buildLaunchEnv({
        targetUrl: "https://example.com",
        vncPassword: "secret"
      })
    ).toEqual({
      VNC_PW: "secret",
      LAUNCH_URL: "https://example.com"
    });
  });

  it("KASM_PROFILE buildLaunchEnv tolerates missing vncPassword", () => {
    expect(KASM_PROFILE.buildLaunchEnv({ targetUrl: "https://example.com" })).toEqual({
      VNC_PW: "",
      LAUNCH_URL: "https://example.com"
    });
  });

  it("every catalog entry exposes a profile", () => {
    for (const kind of BROWSER_KINDS) {
      expect(browserProfile(kind).containerPort).toBeGreaterThan(0);
      expect(typeof browserProfile(kind).streamUrl).toBe("function");
    }
  });
});
