import { afterAll, describe, expect, it } from "vitest";
import { loadConfig } from "../config";
import { DockerSessionRuntime } from "../docker-session-runtime";

// Opt-in end-to-end test against a REAL Docker engine. Skipped unless
// AIRLOCK_E2E=1, so normal CI never runs it. It drives the full lifecycle:
//   ping -> pull -> create -> list -> extend -> stop
//
// Run it with a reachable engine and (optionally) a pre-pulled image:
//   AIRLOCK_E2E=1 AIRLOCK_IMAGE_CHROMIUM=kasmweb/chromium:1.18.0 \
//     bun run --filter @airlock/api test
//
// The first run pulls the (large) Kasm image, so the create test gets a
// generous timeout. Point AIRLOCK_IMAGE_CHROMIUM at a pre-pulled tag to skip
// the download.
const e2eEnabled = process.env.AIRLOCK_E2E === "1";

describe.runIf(e2eEnabled)("DockerSessionRuntime e2e (real engine)", () => {
  const config = loadConfig({
    ...process.env,
    // Keep sessions short; the test stops them explicitly anyway.
    AIRLOCK_DEFAULT_TTL_SECONDS: "60",
    // Isolation network adds engine state; leave it on to exercise the path.
    AIRLOCK_NETWORK_ISOLATION: process.env.AIRLOCK_NETWORK_ISOLATION ?? "true"
  } as NodeJS.ProcessEnv);
  const runtime = new DockerSessionRuntime({ config });
  let createdSessionId: string | null = null;

  afterAll(async () => {
    if (createdSessionId) {
      await runtime.stopSession(createdSessionId).catch(() => undefined);
    }
  });

  it("reaches the engine", async () => {
    expect(await runtime.ping()).toBe(true);
  });

  it("creates, lists, extends, and stops a session", async () => {
    const session = await runtime.createSession({
      browser: "chromium",
      targetUrl: "https://example.com",
      ttlSeconds: 60
    });
    createdSessionId = session.sessionId;

    expect(session.sessionId).toMatch(/[0-9a-f-]{36}/);
    expect(session.browserUrl).toMatch(/^https:\/\//);
    expect(session.vncPassword.length).toBeGreaterThan(0);

    const listed = await runtime.listSessions();
    expect(listed.some((s) => s.sessionId === session.sessionId)).toBe(true);

    const extended = await runtime.extendSession(session.sessionId, 120);
    expect(extended).not.toBeNull();
    expect(new Date(extended!.expiresAt).getTime()).toBeGreaterThan(
      new Date(session.expiresAt).getTime()
    );

    expect(await runtime.stopSession(session.sessionId)).toBe(true);
    createdSessionId = null;
    const afterStop = await runtime.getSession(session.sessionId);
    expect(afterStop).toBeNull();
  }, 300_000);
});
