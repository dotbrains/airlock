import { existsSync } from "node:fs";
import path from "node:path";
import cors from "cors";
import express, { Express, NextFunction, Request, Response } from "express";
import {
  BROWSER_KINDS,
  INTERNAL_TOKEN_HEADER,
  SessionRuntime,
  TTL_MAX_SECONDS,
  TTL_MIN_SECONDS,
  resolveTtl
} from "@airlock/shared";
import { createBearerAuth } from "./auth";
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

  const healthHandler = (_request: Request, response: Response): void => {
    response.json({ ok: true });
  };
  // /healthz is the deploy-contract probe (auth-exempt); /health is kept as an
  // alias so existing tooling and the dev compose keep working.
  app.get("/healthz", healthHandler);
  app.get("/health", healthHandler);

  // Bearer auth guards the management API. The /s/:id capability link and the
  // health probes stay exempt: the session id is itself an unguessable bearer,
  // and probes must work without a token.
  const bearerAuth = createBearerAuth({ token: config.auth.token });

  app.get("/api/meta", bearerAuth, (_request: Request, response: Response) => {
    response.json({
      browsers: BROWSER_KINDS,
      defaultBrowser: config.sessionDefaults.browser,
      defaultTtlSeconds: config.sessionDefaults.ttlSeconds,
      ttlMinSeconds: TTL_MIN_SECONDS,
      ttlMaxSeconds: TTL_MAX_SECONDS
    });
  });

  app.post(
    "/api/sessions",
    bearerAuth,
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
    "/api/sessions",
    bearerAuth,
    asyncRoute(async (_request: Request, response: Response) => {
      const sessions = await sessionRuntime.listSessions();
      response.json({
        sessions: sessions.map((session) => toSessionResponse(session, config))
      });
    })
  );

  app.get(
    "/api/sessions/:sessionId",
    bearerAuth,
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
    bearerAuth,
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

  // Serve the built dashboard (apps/web) when a build directory is configured.
  // The production image points AIRLOCK_WEB_DIR at the bundled SPA so a single
  // process serves both the API and the UI; SPA routes fall back to index.html.
  if (config.server.webDir && existsSync(config.server.webDir)) {
    const webDir = config.server.webDir;
    app.use(express.static(webDir));
    app.get(/^\/(?!api\/|s\/|health$|healthz$).*/, (_request: Request, response: Response) => {
      response.sendFile(path.join(webDir, "index.html"));
    });
  }

  app.use((error: unknown, _request: Request, response: Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    response.status(500).json({
      error: message
    });
  });

  return app;
};
