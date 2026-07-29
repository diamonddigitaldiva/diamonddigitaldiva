import { z } from "https://esm.sh/zod@3.25.76";

/** Maximum accepted request body size, in bytes. */
export const MAX_BODY_BYTES = 8 * 1024;

/** Rate limit: max requests per IP per window. */
export const RATE_LIMIT_MAX = 20;
export const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Allow-list of event types this endpoint will forward. Anything else is
 * rejected before any HQ credential is touched.
 */
export const ALLOWED_EVENT_TYPES = [
  "quiz_completed",
  "link_click",
  "feedback_submitted",
  "contact_message",
] as const;

export const eventSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("quiz_completed"),
      primary_stage: z.string().max(20),
      secondary_stage: z.string().max(20).optional().nullable(),
    }),
    z.object({
      type: z.literal("link_click"),
      link_name: z.string().max(100),
      link_url: z.string().max(500).optional().nullable(),
      primary_stage: z.string().max(20).optional().nullable(),
      secondary_stage: z.string().max(20).optional().nullable(),
    }),
    z.object({
      type: z.literal("feedback_submitted"),
      rating: z.number().int().min(1).max(5).optional().nullable(),
      has_message: z.boolean().default(false),
    }),
    z.object({
      type: z.literal("contact_message"),
      first_name: z.string().trim().min(1).max(100),
      email: z.string().trim().email().max(200),
      message: z.string().trim().min(1).max(2000),
      feedback_id: z.string().uuid().optional(),
    }),
  ])
  // Strip anything the client tried to smuggle in (extra metadata, tokens,
  // tracking blobs). `strict()` on a discriminated union isn't available, so
  // the schema's own field list acts as the allow-list: unknown keys are
  // dropped by zod's default object parsing.
  .transform((v) => v);

export type HqEvent = z.infer<typeof eventSchema>;

/** Simple in-memory fixed-window rate limiter (per isolate). */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  now: number = Date.now(),
  max: number = RATE_LIMIT_MAX,
  windowMs: number = RATE_LIMIT_WINDOW_MS
): { allowed: boolean; retryAfterSeconds: number } {
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  if (bucket.count > max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Test helper — clears all rate limit state. */
export function resetRateLimits() {
  buckets.clear();
}

export function clientKey(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Read the body with a hard size cap. Returns a discriminated result so the
 * caller can respond 413 without buffering an unbounded payload.
 */
export async function readLimitedJson(
  req: Request,
  maxBytes: number = MAX_BODY_BYTES
): Promise<
  | { ok: true; value: unknown }
  | { ok: false; reason: "too_large" | "invalid_json" }
> {
  const declared = req.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) {
    return { ok: false, reason: "too_large" };
  }
  const text = await req.text();
  if (new TextEncoder().encode(text).length > maxBytes) {
    return { ok: false, reason: "too_large" };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}
