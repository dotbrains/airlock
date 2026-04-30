import cors from "cors";
import express, { Express, NextFunction, Request, Response } from "express";
import { INTERNAL_TOKEN_HEADER, SessionRuntime, resolveTtl } from "@airlock/shared";
import { AirlockConfig } from "./config";
import { resolveOrRespond } from "./resolve-session";
import { createSessionBodySchema } from "./schemas";
import { toSessionResponse } from "./session-response";

export interface CreateAppOptions {
  config: AirlockConfig;
  sessionRuntime: SessionRuntime;
}

type AsyncRouteHandler = (request: Request, response: Response) => Promise<void>;

const asyncRoute = (handler: AsyncRouteHandler) => {
  return (request: Request, response: Response, next: NextFunction): void => {
    void handler(request, response).catch(next);
  };
};

export const createApp = ({ config, sessionRuntime }: CreateAppOptions): Express => {
  const app = express();

  app.use(
    cors({
      origin: true
    })
  );
  app.use(express.json({ limit: "128kb" }));

  app.get("/health", (_request: Request, response: Response) => {
    response.json({
      ok: true
    });
  });

  app.post(
    "/api/sessions",
    asyncRoute(async (request: Request, response: Response) => {
      const parsed = createSessionBodySchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({
          error: parsed.error.issues.map((issue) => issue.message).join(", ")
        });
        return;
      }

      const session = await sessionRuntime.createSession({
        browser: parsed.data.browser ?? config.sessionDefaults.browser,
        targetUrl: parsed.data.targetUrl,
        ttlSeconds: resolveTtl({
          requested: parsed.data.ttlSeconds,
          fallback: config.sessionDefaults.ttlSeconds
        })
      });

      response.status(201).json(toSessionResponse(session, config));
    })
  );

  app.get(
    "/api/sessions/:sessionId",
    asyncRoute(async (request: Request, response: Response) => {
      const session = await resolveOrRespond(sessionRuntime, request.params.sessionId, response);
      if (!session) {
        return;
      }

      response.json(toSessionResponse(session, config));
    })
  );

  app.delete(
    "/api/sessions/:sessionId",
    asyncRoute(async (request: Request, response: Response) => {
      const deleted = await sessionRuntime.stopSession(request.params.sessionId);
      response.status(deleted ? 204 : 404).send();
    })
  );

  app.post(
    "/api/internal/prune",
    asyncRoute(async (request: Request, response: Response) => {
      if (config.internal.token) {
        const providedToken = request.headers[INTERNAL_TOKEN_HEADER];
        if (providedToken !== config.internal.token) {
          response.status(401).json({ error: "Unauthorized." });
          return;
        }
      }

      const pruned = await sessionRuntime.pruneExpiredSessions();
      response.json({
        pruned
      });
    })
  );

  app.get(
    "/s/:sessionId",
    asyncRoute(async (request: Request, response: Response) => {
      const session = await resolveOrRespond(sessionRuntime, request.params.sessionId, response);
      if (!session) {
        return;
      }

      response.redirect(302, session.browserUrl);
    })
  );

  app.use((error: unknown, _request: Request, response: Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    response.status(500).json({
      error: message
    });
  });

  return app;
};
