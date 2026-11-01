/**
 * Pure submission handling for send-webhook (no Deno.serve, no env access),
 * so it can be tested with fakes and never touches the real CRM or database.
 *
 * Order: validate legacy fields -> validate declared version (reject before
 * any write/send) -> save to the database -> attempt CRM delivery.
 *
 * Response contract: `success` keeps its original meaning (the CRM webhook
 * accepted the submission). `saved`, `delivered` and `queued` are additive.
 */
import { sanitizeV2 } from "./v2.ts";
import { isV3Version, sanitizeV3 } from "./v3.ts";

export interface QuizPayload {
  firstName: string;
  email: string;
  primaryStage: string;
  secondaryStage: string | null;
  primaryStageUrl: string;
  secondaryStageUrl: string | null;
  timestamp: string;
  source: string;
}

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
const isValidString = (s: unknown, max = 100): s is string => typeof s === "string" && s.trim().length > 0 && s.length <= max;
const isValidNullableString = (s: unknown, max = 100) => s === null || (typeof s === "string" && s.length <= max);
const isValidTimestamp = (t: unknown): t is string => typeof t === "string" && !isNaN(new Date(t).getTime());
const isValidSource = (s: unknown): s is string => typeof s === "string" && s.length > 0 && s.length <= 500;
const sanitizeString = (s: string) => s.replace(/[\x00-\x1F\x7F]/g, "").trim();
const isValidUrl = (u: unknown): u is string => {
  if (typeof u !== "string" || u.length > 500) return false;
  try {
    new URL(u);
    return true;
  } catch {
    return false;
  }
};
const isValidNullableUrl = (u: unknown) => u === null || isValidUrl(u);

export function validatePayload(payload: unknown): { valid: true; data: QuizPayload } | { valid: false; error: string } {
  if (!payload || typeof payload !== "object") return { valid: false, error: "Invalid payload format" };
  const p = payload as Record<string, unknown>;
  if (!isValidString(p.firstName, 100)) return { valid: false, error: "Invalid or missing firstName" };
  if (!isValidString(p.email, 255) || !isValidEmail(p.email)) return { valid: false, error: "Invalid or missing email" };
  if (!isValidString(p.primaryStage, 100)) return { valid: false, error: "Invalid or missing primaryStage" };
  if (!isValidNullableString(p.secondaryStage, 100)) return { valid: false, error: "Invalid secondaryStage" };
  if (!isValidUrl(p.primaryStageUrl)) return { valid: false, error: "Invalid or missing primaryStageUrl" };
  if (!isValidNullableUrl(p.secondaryStageUrl)) return { valid: false, error: "Invalid secondaryStageUrl" };
  if (!isValidTimestamp(p.timestamp)) return { valid: false, error: "Invalid or missing timestamp" };
  if (!isValidSource(p.source)) return { valid: false, error: "Invalid or missing source" };
  return {
    valid: true,
    data: {
      firstName: sanitizeString(p.firstName as string),
      email: sanitizeString(p.email as string).toLowerCase(),
      primaryStage: sanitizeString(p.primaryStage as string),
      secondaryStage: p.secondaryStage ? sanitizeString(p.secondaryStage as string) : null,
      primaryStageUrl: p.primaryStageUrl as string,
      secondaryStageUrl: p.secondaryStageUrl as string | null,
      timestamp: p.timestamp as string,
      source: sanitizeString(p.source as string),
    },
  };
}

export type Versioned = { assessmentVersion: string; answers: unknown; result: unknown } | null;

/**
 * - No version: legacy (v1) or v2 handling, unchanged.
 * - `map-v2.*`: v2 sanitizer, unchanged (malformed v2 blocks are dropped).
 * - `map-v3*`: must be the live v3 version with complete, valid answers;
 *   the result is re-derived server-side. Otherwise rejected.
 * - Any other explicitly provided version: rejected.
 */
export function resolveVersion(
  raw: Record<string, unknown>,
  payload: QuizPayload
): { ok: true; payload: QuizPayload; versioned: Versioned } | { ok: false; error: string } {
  const v = raw.assessmentVersion;
  if (v === undefined) return { ok: true, payload, versioned: sanitizeV2(raw) };
  if (typeof v === "string" && /^map-v2\./.test(v)) return { ok: true, payload, versioned: sanitizeV2(raw) };
  if (isV3Version(v)) {
    const v3 = sanitizeV3(raw);
    if (!v3) return { ok: false, error: "Invalid or incomplete assessment answers" };
    return { ok: true, payload: { ...payload, ...v3.legacy }, versioned: v3.fields };
  }
  return { ok: false, error: "Unknown assessment version" };
}

export interface SubmissionDeps {
  webhookUrl: string | undefined;
  /** Inserts the row; returns its id, or null if the insert failed. */
  save: (row: Record<string, unknown>) => Promise<string | null>;
  /** Marks delivered and releases the delivery lock. */
  markSent: (id: string) => Promise<void>;
  /** Releases the delivery lock after a failed attempt so the retry job can claim it. */
  release: (id: string) => Promise<void>;
  /** Clock for the delivery lock (tests pass a fixed one). */
  now?: () => number;
  post: (url: string, body: string) => Promise<{ ok: boolean; status: number }>;
  log?: (msg: string) => void;
}

/** Bounded CRM post; the row lock outlasts it, and retries wait 5 minutes. */
export const WEBHOOK_TIMEOUT_MS = 20_000;
export const DELIVERY_LOCK_MS = 120_000;

export interface SubmissionResponse {
  status: number;
  body: {
    success: boolean;
    saved?: boolean;
    delivered?: boolean;
    queued?: boolean;
    message?: string;
    error?: string;
  };
}

export async function handleSubmission(rawPayload: unknown, deps: SubmissionDeps): Promise<SubmissionResponse> {
  const log = deps.log ?? (() => {});
  const validation = validatePayload(rawPayload);
  if (!validation.valid) return { status: 400, body: { success: false, error: validation.error } };

  const raw = rawPayload as Record<string, unknown>;
  const resolved = resolveVersion(raw, validation.data);
  if (!resolved.ok) return { status: 400, body: { success: false, error: resolved.error } };
  const { payload, versioned } = resolved;

  // 1) Save first, so a result is never lost when the CRM is unavailable.
  let id: string | null = null;
  try {
    id = await deps.save({
      first_name: payload.firstName,
      email: payload.email,
      primary_stage: payload.primaryStage,
      secondary_stage: payload.secondaryStage,
      primary_stage_url: payload.primaryStageUrl,
      secondary_stage_url: payload.secondaryStageUrl,
      source: payload.source,
      webhook_sent: false,
      // Claimed by this initial send so the retry job can't post it concurrently.
      webhook_inflight_until: new Date((deps.now ?? Date.now)() + DELIVERY_LOCK_MS).toISOString(),
      assessment_version: versioned?.assessmentVersion ?? null,
      answers: versioned?.answers ?? null,
      result: versioned?.result ?? null,
    });
  } catch {
    id = null;
  }
  const saved = id !== null;
  log(saved ? "Submission saved to database" : "Database insert failed");

  // 2) Deliver to the CRM if configured.
  if (!deps.webhookUrl) {
    log("CRM webhook not configured; delivery unavailable");
    if (id) {
      try {
        await deps.release(id);
      } catch {
        /* lock expires on its own */
      }
    }
    return saved
      ? { status: 202, body: { success: false, saved: true, delivered: false, queued: false, message: "Saved; delivery unavailable" } }
      : { status: 500, body: { success: false, saved: false, delivered: false, queued: false, error: "Service configuration error" } };
  }

  const outbound = versioned ? { ...payload, ...versioned } : payload;
  let delivered = false;
  try {
    const res = await deps.post(deps.webhookUrl, JSON.stringify(outbound));
    delivered = res.ok;
    log(`Webhook response status: ${res.status}`);
  } catch {
    delivered = false;
    log("Webhook request failed");
  }

  if (delivered) {
    if (id) {
      try {
        await deps.markSent(id);
      } catch {
        log("Failed to update webhook status");
      }
    }
    return { status: 200, body: { success: true, saved, delivered: true, queued: false, message: "Submission received" } };
  }

  if (id) {
    try {
      await deps.release(id);
    } catch {
      log("Failed to release delivery lock (it expires on its own)");
    }
  }

  // Unsent saved rows are picked up by the scheduled retry-webhooks job.
  return saved
    ? { status: 202, body: { success: false, saved: true, delivered: false, queued: true, message: "Saved; delivery queued for retry" } }
    : { status: 500, body: { success: false, saved: false, delivered: false, queued: false, error: "Failed to process submission. Please try again." } };
}
