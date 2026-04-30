import { trimTrailingSlash } from "./bootstrap";

export const INTERNAL_PRUNE_PATH = "/api/internal/prune";
export const INTERNAL_TOKEN_HEADER = "x-airlock-internal-token";

export interface PruneResponse {
  pruned: number;
}

export interface InternalApiClientOptions {
  baseUrl: string;
  token?: string;
  fetchImpl?: typeof fetch;
}

export interface InternalApiClient {
  prune(): Promise<PruneResponse>;
}

export class InternalApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: string
  ) {
    super(message);
    this.name = "InternalApiError";
  }
}

export const createInternalApiClient = ({
  baseUrl,
  token,
  fetchImpl = fetch
}: InternalApiClientOptions): InternalApiClient => {
  const root = trimTrailingSlash(baseUrl);

  return {
    async prune(): Promise<PruneResponse> {
      const response = await fetchImpl(`${root}${INTERNAL_PRUNE_PATH}`, {
        method: "POST",
        headers: token ? { [INTERNAL_TOKEN_HEADER]: token } : undefined
      });

      if (!response.ok) {
        const body = await response.text();
        throw new InternalApiError(
          `Airlock internal prune failed (${response.status})`,
          response.status,
          body
        );
      }

      const payload = (await response.json()) as { pruned?: number };
      return { pruned: payload.pruned ?? 0 };
    }
  };
};
