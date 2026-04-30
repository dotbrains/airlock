import type { Response } from "express";
import { AirlockSession, SessionRuntime, isExpired } from "@airlock/shared";

export const resolveOrRespond = async (
  runtime: SessionRuntime,
  sessionId: string,
  response: Response
): Promise<AirlockSession | null> => {
  const session = await runtime.getSession(sessionId);
  if (!session) {
    response.status(404).json({ error: "Session not found." });
    return null;
  }
  if (isExpired(session)) {
    await runtime.stopSession(session.sessionId);
    response.status(410).json({ error: "Session expired." });
    return null;
  }
  return session;
};
