export {
  BROWSER_CATALOG,
  BROWSER_KINDS,
  browserProfile,
  defaultBrowserImage,
  isBrowserKind,
  toBrowserKind
} from "./browser-catalog";
export type { BrowserCatalogEntry, BrowserKind } from "./browser-catalog";

export { KASM_PROFILE } from "./container-profile";
export type { ContainerImageProfile, LaunchEnvInput } from "./container-profile";

export {
  TTL_DEFAULT_SECONDS,
  TTL_MAX_SECONDS,
  TTL_MIN_SECONDS,
  clampTtl,
  expiresAt,
  isExpired,
  resolveTtl
} from "./session-policy";
export type { ResolveTtlInput } from "./session-policy";

export {
  SESSION_LABEL_KEYS,
  decodeSessionLabels,
  encodeSessionLabels,
  isManagedLabels
} from "./session-labels";
export type { DecodedSessionLabels, SessionLabelInput } from "./session-labels";

export { discoverEnvFile, toInteger, trimTrailingSlash } from "./bootstrap";
export type { DiscoverEnvFileOptions } from "./bootstrap";

export {
  INTERNAL_PRUNE_PATH,
  INTERNAL_TOKEN_HEADER,
  InternalApiError,
  createInternalApiClient
} from "./internal-api";
export type { InternalApiClient, InternalApiClientOptions, PruneResponse } from "./internal-api";

export interface CreateSessionInput {
  targetUrl: string;
  browser: import("./browser-catalog").BrowserKind;
  ttlSeconds: number;
}

export interface AirlockSession {
  sessionId: string;
  browser: import("./browser-catalog").BrowserKind;
  targetUrl: string;
  browserUrl: string;
  // Per-session VNC password the viewer logs in with. Each session gets a
  // distinct random secret so knowing one stream's credentials never grants
  // access to another.
  vncPassword: string;
  createdAt: string;
  expiresAt: string;
}

export interface ImagePullResult {
  image: string;
  ok: boolean;
}

export interface SessionRuntime {
  createSession(input: CreateSessionInput): Promise<AirlockSession>;
  getSession(sessionId: string): Promise<AirlockSession | null>;
  listSessions(): Promise<AirlockSession[]>;
  // Push a running session's expiry further out by ttlSeconds from now.
  // Returns the updated session, or null if it is missing/expired.
  extendSession(sessionId: string, ttlSeconds: number): Promise<AirlockSession | null>;
  stopSession(sessionId: string): Promise<boolean>;
  pruneExpiredSessions(now?: Date): Promise<number>;
  // Pre-pull every configured browser image so the first launch is fast.
  pullBrowserImages(): Promise<ImagePullResult[]>;
  // Liveness of the underlying engine, for the readiness probe.
  ping(): Promise<boolean>;
}
