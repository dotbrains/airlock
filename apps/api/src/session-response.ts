import { AirlockSession } from "@airlock/shared";
import { AirlockConfig } from "./config";

export interface SessionResponseBody extends AirlockSession {
  sessionUrl: string;
}

export const toSessionResponse = (
  session: AirlockSession,
  config: AirlockConfig
): SessionResponseBody => ({
  ...session,
  sessionUrl: new URL(`/s/${session.sessionId}`, config.server.publicBaseUrl).toString()
});
