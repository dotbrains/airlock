import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";

const BEARER_PREFIX = "Bearer ";

// Constant-time comparison so a wrong token cannot be recovered by timing the
// response. Length is leaked (unavoidable with timingSafeEqual), which is an
// acceptable trade for a bearer secret of fixed operator-chosen length.
const tokensMatch = (expected: string, provided: string): boolean => {
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  if (expectedBytes.length !== providedBytes.length) {
    return false;
  }
  return timingSafeEqual(expectedBytes, providedBytes);
};

const extractBearerToken = (header: string | undefined): string | null => {
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    return null;
  }
  return header.slice(BEARER_PREFIX.length).trim();
};

export interface BearerAuthOptions {
  token?: string;
}

// Gate management routes behind a bearer token. When no token is configured
// the guard is a no-op — local/dev runs stay frictionless — but exposing the
// API beyond localhost without a token is called out in the docs as unsafe.
export const createBearerAuth = ({ token }: BearerAuthOptions): RequestHandler => {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!token) {
      next();
      return;
    }

    const provided = extractBearerToken(request.headers.authorization);
    if (!provided || !tokensMatch(token, provided)) {
      response.status(401).json({ error: "Unauthorized." });
      return;
    }

    next();
  };
};
