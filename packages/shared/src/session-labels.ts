import { BrowserKind, toBrowserKind } from "./browser-catalog";

export const SESSION_LABEL_KEYS = {
  managed: "airlock.managed",
  sessionId: "airlock.session_id",
  browser: "airlock.browser",
  targetUrl: "airlock.target_url",
  vncPassword: "airlock.vnc_password",
  createdAt: "airlock.created_at",
  expiresAt: "airlock.expires_at"
} as const;

export interface SessionLabelInput {
  sessionId: string;
  browser: BrowserKind;
  targetUrl: string;
  vncPassword: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface DecodedSessionLabels {
  sessionId: string;
  browser: BrowserKind;
  targetUrl: string;
  vncPassword: string;
  createdAt: string;
  expiresAt: string;
}

export const encodeSessionLabels = (input: SessionLabelInput): Record<string, string> => ({
  [SESSION_LABEL_KEYS.managed]: "true",
  [SESSION_LABEL_KEYS.sessionId]: input.sessionId,
  [SESSION_LABEL_KEYS.browser]: input.browser,
  [SESSION_LABEL_KEYS.targetUrl]: input.targetUrl,
  [SESSION_LABEL_KEYS.vncPassword]: input.vncPassword,
  [SESSION_LABEL_KEYS.createdAt]: input.createdAt.toISOString(),
  [SESSION_LABEL_KEYS.expiresAt]: input.expiresAt.toISOString()
});

export const isManagedLabels = (labels: Record<string, string> | undefined | null): boolean =>
  labels?.[SESSION_LABEL_KEYS.managed] === "true";

const isParseableIsoDate = (value: string | undefined): value is string =>
  typeof value === "string" && value.length > 0 && !Number.isNaN(new Date(value).getTime());

export const decodeSessionLabels = (
  labels: Record<string, string> | undefined | null,
  fallbackBrowser: BrowserKind
): DecodedSessionLabels | null => {
  if (!isManagedLabels(labels)) {
    return null;
  }
  const sessionId = labels?.[SESSION_LABEL_KEYS.sessionId];
  const targetUrl = labels?.[SESSION_LABEL_KEYS.targetUrl];
  const createdAt = labels?.[SESSION_LABEL_KEYS.createdAt];
  const expiresAt = labels?.[SESSION_LABEL_KEYS.expiresAt];
  if (
    !sessionId ||
    !targetUrl ||
    !isParseableIsoDate(createdAt) ||
    !isParseableIsoDate(expiresAt)
  ) {
    return null;
  }
  return {
    sessionId,
    browser: toBrowserKind(labels?.[SESSION_LABEL_KEYS.browser], fallbackBrowser),
    targetUrl,
    // Tolerate older containers created before per-session passwords existed.
    vncPassword: labels?.[SESSION_LABEL_KEYS.vncPassword] ?? "",
    createdAt,
    expiresAt
  };
};
