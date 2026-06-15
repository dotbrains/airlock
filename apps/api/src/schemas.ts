import { z } from "zod";
import { BROWSER_KINDS, TTL_MAX_SECONDS, TTL_MIN_SECONDS } from "@airlock/shared";

const browserEnum = z.enum(BROWSER_KINDS);

export const createSessionBodySchema = z.object({
  targetUrl: z
    .string()
    .url()
    .refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
      message: "targetUrl must start with http:// or https://"
    }),
  browser: browserEnum.optional(),
  ttlSeconds: z.number().int().min(TTL_MIN_SECONDS).max(TTL_MAX_SECONDS).optional()
});

export type CreateSessionBody = z.infer<typeof createSessionBodySchema>;

export const extendSessionBodySchema = z.object({
  ttlSeconds: z.number().int().min(TTL_MIN_SECONDS).max(TTL_MAX_SECONDS)
});

export type ExtendSessionBody = z.infer<typeof extendSessionBodySchema>;
