// Browser-side client for the Airlock management API. Kept free of React so
// the request/response contract can be unit-tested in isolation.

export interface SessionResponse {
  sessionId: string;
  browser: string;
  targetUrl: string;
  browserUrl: string;
  sessionUrl: string;
  createdAt: string;
  expiresAt: string;
}

export interface AirlockMeta {
  browsers: string[];
  defaultBrowser: string;
  defaultTtlSeconds: number;
  ttlMinSeconds: number;
  ttlMaxSeconds: number;
}

export interface CreateSessionInput {
  targetUrl: string;
  browser?: string;
  ttlSeconds?: number;
}

export class AirlockApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "AirlockApiError";
  }
}

export interface AirlockClient {
  getMeta(): Promise<AirlockMeta>;
  listSessions(): Promise<SessionResponse[]>;
  createSession(input: CreateSessionInput): Promise<SessionResponse>;
  stopSession(sessionId: string): Promise<void>;
}

export interface AirlockClientOptions {
  // Defaults to same-origin (""), which is how the bundled single-image
  // deployment serves the SPA and API together.
  baseUrl?: string;
  token?: string;
  fetchImpl?: typeof fetch;
}

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

export const createAirlockClient = ({
  baseUrl = "",
  token,
  fetchImpl = fetch
}: AirlockClientOptions = {}): AirlockClient => {
  const root = trimTrailingSlash(baseUrl);

  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const headers = new Headers(init.headers);
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    if (init.body) {
      headers.set("content-type", "application/json");
    }

    const response = await fetchImpl(`${root}${path}`, { ...init, headers });
    if (!response.ok) {
      const message = await errorMessage(response);
      throw new AirlockApiError(message, response.status);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  };

  return {
    async getMeta() {
      return request<AirlockMeta>("/api/meta");
    },
    async listSessions() {
      const payload = await request<{ sessions: SessionResponse[] }>("/api/sessions");
      return payload.sessions;
    },
    async createSession(input) {
      return request<SessionResponse>("/api/sessions", {
        method: "POST",
        body: JSON.stringify(input)
      });
    },
    async stopSession(sessionId) {
      await request<void>(`/api/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE"
      });
    }
  };
};

const errorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: string };
    if (body?.error) {
      return body.error;
    }
  } catch {
    // fall through to the status-based default
  }
  if (response.status === 401) {
    return "Unauthorized — check your access token.";
  }
  return `Request failed with status ${response.status}.`;
};
