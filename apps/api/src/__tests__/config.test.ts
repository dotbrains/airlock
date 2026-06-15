import { describe, expect, it } from "vitest";
import { loadConfig } from "../config";

const baseEnv = { AIRLOCK_PORT: "8787" } as NodeJS.ProcessEnv;

describe("loadConfig security-relevant defaults", () => {
  it("enables network isolation by default", () => {
    expect(loadConfig(baseEnv).containerLaunch.networkIsolation).toBe(true);
  });

  it("keeps isolation on for an unrecognized boolean (no silent downgrade)", () => {
    const config = loadConfig({ ...baseEnv, AIRLOCK_NETWORK_ISOLATION: "treu" });
    expect(config.containerLaunch.networkIsolation).toBe(true);
  });

  it("honors an explicit falsy isolation value", () => {
    const config = loadConfig({ ...baseEnv, AIRLOCK_NETWORK_ISOLATION: "false" });
    expect(config.containerLaunch.networkIsolation).toBe(false);
  });

  it("trusts a single proxy hop by default", () => {
    expect(loadConfig(baseEnv).server.trustProxyHops).toBe(1);
  });

  it("applies resource-cap defaults", () => {
    const launch = loadConfig(baseEnv).containerLaunch;
    expect(launch.memoryBytes).toBe(2 * 1_073_741_824);
    expect(launch.nanoCpus).toBe(2_000_000_000);
    expect(launch.pidsLimit).toBe(512);
  });

  it("treats a zero cap as unlimited", () => {
    const launch = loadConfig({ ...baseEnv, AIRLOCK_SESSION_MEMORY_BYTES: "0" }).containerLaunch;
    expect(launch.memoryBytes).toBe(0);
  });
});
