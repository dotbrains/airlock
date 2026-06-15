import type { AirlockConfig } from "../config";

// A complete, overridable AirlockConfig for tests so new config fields only
// need a default in one place.
export const makeTestConfig = (overrides: Partial<AirlockConfig> = {}): AirlockConfig => ({
  server: {
    port: 8787,
    bindHost: "0.0.0.0",
    publicBaseUrl: "http://localhost:8787",
    sessionHost: "localhost",
    ...overrides.server
  },
  sessionDefaults: {
    ttlSeconds: 1800,
    browser: "chromium",
    ...overrides.sessionDefaults
  },
  containerLaunch: {
    dockerSocketPath: "/var/run/docker.sock",
    shmSizeBytes: 1073741824,
    vncPassword: "change-me",
    memoryBytes: 2147483648,
    nanoCpus: 2000000000,
    pidsLimit: 512,
    networkIsolation: false,
    networkName: "airlock",
    browserImages: {
      chromium: "kasmweb/chromium:1.18.0",
      chrome: "kasmweb/chrome:1.18.0",
      firefox: "kasmweb/firefox:1.18.0",
      edge: "kasmweb/edge:1.18.0",
      brave: "kasmweb/brave:1.18.0",
      vivaldi: "kasmweb/vivaldi:1.18.0",
      tor: "kasmweb/tor-browser:1.18.0"
    },
    ...overrides.containerLaunch
  },
  limits: {
    maxSessions: 25,
    rateLimitWindowMs: 60000,
    rateLimitMax: 30,
    ...overrides.limits
  },
  auth: { ...overrides.auth },
  internal: { ...overrides.internal }
});
