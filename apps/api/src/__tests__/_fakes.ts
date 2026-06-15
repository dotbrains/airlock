import { AirlockSession, CreateSessionInput, SessionRuntime } from "@airlock/shared";

export const makeSession = (overrides: Partial<AirlockSession> = {}): AirlockSession => ({
  sessionId: "session-1",
  browser: "chromium",
  targetUrl: "https://example.com",
  browserUrl: "https://localhost:6901",
  vncPassword: "test-vnc-password",
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  ...overrides
});

export interface FakeSessionRuntimeOptions {
  initial?: AirlockSession | null;
  onCreate?: (input: CreateSessionInput) => AirlockSession;
}

export interface FakeSessionRuntimeOptions2 extends FakeSessionRuntimeOptions {
  pingResult?: boolean;
}

export interface FakeSessionRuntime extends SessionRuntime {
  readonly stopped: string[];
  readonly pruneCalls: number;
}

export const createFakeSessionRuntime = (
  options: FakeSessionRuntimeOptions2 = {}
): FakeSessionRuntime => {
  let current: AirlockSession | null =
    options.initial === undefined ? makeSession() : options.initial;
  const stopped: string[] = [];
  let pruneCalls = 0;

  return {
    get stopped() {
      return stopped;
    },
    get pruneCalls() {
      return pruneCalls;
    },
    async createSession(input: CreateSessionInput): Promise<AirlockSession> {
      current = options.onCreate
        ? options.onCreate(input)
        : makeSession({ browser: input.browser, targetUrl: input.targetUrl });
      return current;
    },
    async getSession(_sessionId: string): Promise<AirlockSession | null> {
      return current;
    },
    async listSessions(): Promise<AirlockSession[]> {
      return current ? [current] : [];
    },
    async extendSession(sessionId: string, ttlSeconds: number): Promise<AirlockSession | null> {
      if (!current || current.sessionId !== sessionId) {
        return null;
      }
      current = { ...current, expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString() };
      return current;
    },
    async pullBrowserImages() {
      return [{ image: "kasmweb/chromium:1.18.0", ok: true }];
    },
    async stopSession(sessionId: string): Promise<boolean> {
      stopped.push(sessionId);
      const wasPresent = current !== null;
      current = null;
      return wasPresent;
    },
    async pruneExpiredSessions(_now?: Date): Promise<number> {
      pruneCalls += 1;
      return 0;
    },
    async ping(): Promise<boolean> {
      return options.pingResult ?? true;
    }
  };
};
