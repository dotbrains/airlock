import type { NextFunction, Request, RequestHandler, Response } from "express";

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

// Fixed-window per-client rate limiter, kept in-process (no Redis). Good enough
// for a single-node control plane; a max of 0 disables it. Clients are keyed by
// source IP. The bucket map is swept lazily on each request to bound memory.
export const createRateLimit = (
  options: RateLimitOptions,
  now: () => number = Date.now
): RequestHandler => {
  const buckets = new Map<string, Bucket>();

  return (request: Request, response: Response, next: NextFunction): void => {
    if (options.max <= 0) {
      next();
      return;
    }

    const current = now();
    const key = request.ip ?? "unknown";

    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= current) {
        buckets.delete(bucketKey);
      }
    }

    const existing = buckets.get(key);
    const bucket =
      existing && existing.resetAt > current
        ? existing
        : { count: 0, resetAt: current + options.windowMs };
    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(0, options.max - bucket.count);
    response.setHeader("RateLimit-Limit", String(options.max));
    response.setHeader("RateLimit-Remaining", String(remaining));

    if (bucket.count > options.max) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - current) / 1000);
      response.setHeader("Retry-After", String(retryAfterSeconds));
      response.status(429).json({ error: "Too many requests. Slow down." });
      return;
    }

    next();
  };
};
