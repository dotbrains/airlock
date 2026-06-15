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
import { logger } from "./logger";
import { Metrics } from "./metrics";
import { createRateLimit } from "./rate-limit";
import { resolveOrRespond } from "./resolve-session";
import { createSessionBodySchema } from "./schemas";
import { toSessionResponse } from "./session-response";

export interface CreateAppOptions {
  config: AirlockConfig;
  sessionRuntime: SessionRuntime;
  metrics?: Metrics;
}

type AsyncRouteHandler = (request: Request, response: Response) => Promise<void>;

const asyncRoute = (handler: AsyncRouteHandler) => {
  return (request: Request, response: Response, next: NextFunction): void => {
    void handler(request, response).catch(next);
  };
};

export const createApp = ({ config, sessionRuntime, metrics }: CreateAppOptions): Express => {
  const app = express();
  const meter = metrics ?? new Metrics();

  // Trust exactly one reverse-proxy hop for the client IP. `true` would honor
  // any X-Forwarded-For, letting clients spoof IPs to evade the per-IP rate
  // limit; override AIRLOCK_TRUST_PROXY_HOPS for a deeper proxy chain.
  app.set("trust proxy", config.server.trustProxyHops);

  // In-process reservation count for in-flight creates, so the concurrent-cap
  // check is atomic within this process (single-node control plane) rather than
  // a check-then-act race against listSessions().
  let pendingCreates = 0;

  app.use(
    cors({
      origin: true
    })
  );
  app.use(express.json({ limit: "128kb" }));

  // /healthz is liveness (the process is up); /readyz is readiness (the Docker
  // engine is reachable). Both are auth-exempt so platform probes need no token.
  app.get("/healthz", (_request: Request, response: Response) => {
    response.json({ ok: true });
  });
  app.get("/health", (_request: Request, response: Response) => {
    response.json({ ok: true });
  });
  app.get(
    "/readyz",
    asyncRoute(async (_request: Request, response: Response) => {
      const engineReachable = await sessionRuntime.ping();
      response.status(engineReachable ? 200 : 503).json({
        ok: engineReachable,
        engine: engineReachable ? "reachable" : "unreachable"
      });
    })
  );

  // Bearer auth guards the management API. The /s/:id capability link and the
  // health probes stay exempt: the session id is itself an unguessable bearer,
  // and probes must work without a token.
  const bearerAuth = createBearerAuth({ token: config.auth.token });
  const createLimiter = createRateLimit({
    windowMs: config.limits.rateLimitWindowMs,
    max: config.limits.rateLimitMax
  });

  app.get("/metrics", bearerAuth, (_request: Request, response: Response) => {
    void sessionRuntime
      .listSessions()
      .then((sessions) => {
        response.type("text/plain; version=0.0.4").send(meter.render(sessions.length));
      })
      .catch(() => {
        // Engine unreachable — still serve counters with an unknown gauge.
        response.type("text/plain; version=0.0.4").send(meter.render(0));
      });
  });

  app.get("/api/meta", bearerAuth, (_request: Request, response: Response) => {
    response.json({
      browsers: BROWSER_KINDS,
      defaultBrowser: config.sessionDefaults.browser,
      defaultTtlSeconds: config.sessionDefaults.ttlSeconds,
      ttlMinSeconds: TTL_MIN_SECONDS,
      ttlMaxSeconds: TTL_MAX_SECONDS,
      maxSessions: config.limits.maxSessions
    });
  });

  app.post(
    "/api/sessions",
    bearerAuth,
    createLimiter,
    asyncRoute(async (request: Request, response: Response) => {
      const parsed = createSessionBodySchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({
          error: parsed.error.issues.map((issue) => issue.message).join(", ")
        });
        return;
      }

      // Enforce the concurrent-session cap before spending engine resources,
      // counting in-flight creates so concurrent requests can't all slip past.
      if (config.limits.maxSessions > 0) {
        const active = await sessionRuntime.listSessions();
        if (active.length + pendingCreates >= config.limits.maxSessions) {
          response.status(429).json({
            error: `Session limit reached (${config.limits.maxSessions} active).`
          });
          return;
        }
      }

      pendingCreates += 1;
      try {
        const session = await sessionRuntime.createSession({
          browser: parsed.data.browser ?? config.sessionDefaults.browser,
          targetUrl: parsed.data.targetUrl,
          ttlSeconds: resolveTtl({
            requested: parsed.data.ttlSeconds,
            fallback: config.sessionDefaults.ttlSeconds
          })
        });
        meter.recordCreated();
        logger.info("session.created", {
          sessionId: session.sessionId,
          browser: session.browser,
          expiresAt: session.expiresAt
        });
        response.status(201).json(toSessionResponse(session, config));
      } catch (error) {
        meter.recordCreateFailure();
        logger.error("session.create_failed", {
          message: error instanceof Error ? error.message : String(error)
        });
        throw error;
      } finally {
        pendingCreates -= 1;
      }
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
      if (deleted) {
        meter.recordStopped();
        logger.info("session.stopped", { sessionId: request.params.sessionId });
      }
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
      if (pruned > 0) {
        meter.recordExpired(pruned);
        logger.info("session.pruned", { count: pruned });
      }
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
    app.get(/^\/(?!api\/|s\/|health$|healthz$|readyz$|metrics$).*/, (_request, response) => {
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
