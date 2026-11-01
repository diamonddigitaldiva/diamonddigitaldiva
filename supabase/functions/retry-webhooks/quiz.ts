/**
 * Quiz-submission retry loop (pure, testable with fakes).
 *
 * Each row is claimed atomically one at a time (`claim_quiz_submission_for_retry`:
 * FOR UPDATE SKIP LOCKED + a time-limited lock), so overlapping cron runs and
 * the initial send never post the same row at the same time. Every attempt,
 * including thrown/timeout errors, is counted and the lock released
 * (`finish_quiz_submission_retry`). Rows stop being retried after 10 attempts.
 *
 * Limit: delivery is at-least-once, not exactly-once. If the CRM accepts a
 * post but its reply is lost (timeout/network) or the outcome can't be
 * recorded, the row will be sent again later. The CRM webhook has no
 * verified idempotency-key support, so it can't deduplicate for us.
 */

export const MAX_RETRY_ATTEMPTS = 10;
export const RETRY_OLDER_THAN_MINUTES = 5;
export const WEBHOOK_TIMEOUT_MS = 20_000;
/** Lock must outlast one bounded post plus bookkeeping. */
export const CLAIM_LOCK_SECONDS = 120;
export const MAX_RETRIES_PER_RUN = 50;
/** Stop starting new posts after this, well inside the function's run limit. */
export const RUN_BUDGET_MS = 100_000;

export interface QuizRow {
  id: string;
  first_name: string;
  email: string;
  primary_stage: string;
  secondary_stage: string | null;
  primary_stage_url: string | null;
  secondary_stage_url: string | null;
  created_at: string;
  source: string | null;
  assessment_version: string | null;
  answers: unknown;
  result: unknown;
  retry_count: number | null;
  marketing_consent?: boolean | null;
  marketing_consent_at?: string | null;
  marketing_consent_source?: string | null;
  marketing_consent_version?: string | null;
  crm_forwarding_status?: string | null;
}

/** v3+ rows need explicit stored consent; suppressed rows are never sent. */
export function mayForward(s: QuizRow): boolean {
  if (s.crm_forwarding_status === "suppressed_no_consent") return false;
  if (s.assessment_version && s.assessment_version.startsWith("map-v3")) return s.marketing_consent === true;
  return true;
}

export interface QuizRetryDeps {
  /** Atomically claims one eligible row not in `exclude`, or null when none are left. */
  claimNext: (exclude: string[]) => Promise<QuizRow | null>;
  /** Releases the lock without counting an attempt (row not eligible to send). */
  release: (id: string) => Promise<void>;
  /** Counts the attempt and releases the lock. */
  finish: (id: string, delivered: boolean) => Promise<void>;
  /** One bounded POST; may throw on network error or timeout. */
  post: (body: string) => Promise<{ ok: boolean; status: number }>;
  now?: () => number;
  log?: (msg: string) => void;
}

/** Legacy field names/types unchanged; stored versioned data is resent as-is. */
export function buildRetryPayload(s: QuizRow) {
  return {
    firstName: s.first_name,
    email: s.email,
    primaryStage: s.primary_stage,
    secondaryStage: s.secondary_stage,
    primaryStageUrl: s.primary_stage_url,
    secondaryStageUrl: s.secondary_stage_url,
    timestamp: s.created_at,
    source: s.source,
    ...(s.assessment_version
      ? { assessmentVersion: s.assessment_version, answers: s.answers, result: s.result }
      : {}),
    // Stored consent is resent as recorded (v3+ only; legacy payloads unchanged).
    ...(s.assessment_version?.startsWith("map-v3") && s.marketing_consent === true
      ? {
          marketingConsent: true,
          marketingConsentAt: s.marketing_consent_at ?? null,
          marketingConsentSource: s.marketing_consent_source ?? null,
          marketingConsentVersion: s.marketing_consent_version ?? null,
        }
      : {}),
  };
}

export async function retryQuizSubmissions(deps: QuizRetryDeps) {
  const now = deps.now ?? Date.now;
  const log = deps.log ?? (() => {});
  const started = now();
  let claimed = 0;
  let succeeded = 0;
  let failed = 0;
  const attempted: string[] = [];

  while (attempted.length < MAX_RETRIES_PER_RUN && now() - started < RUN_BUDGET_MS) {
    // A released (failed) row is never re-claimed within the same run.
    const row = await deps.claimNext(attempted);
    if (!row) break;
    attempted.push(row.id);

    // Defence in depth: the claim already excludes these. Never post them.
    if (!mayForward(row)) {
      log(`Skipping ${row.id}: not allowed to forward (no explicit consent)`);
      try {
        await deps.release(row.id);
      } catch {
        /* lock expires on its own */
      }
      continue;
    }
    claimed++;

    let delivered = false;
    try {
      const res = await deps.post(JSON.stringify(buildRetryPayload(row)));
      delivered = res.ok;
      if (!res.ok) log(`Webhook failed for ${row.id} - Status: ${res.status}`);
    } catch {
      delivered = false;
      log(`Webhook request error for ${row.id}`);
    }

    try {
      await deps.finish(row.id, delivered);
    } catch {
      // The lock expires on its own; the attempt may be retried later.
      log(`Failed to record retry outcome for ${row.id}`);
    }
    if (delivered) succeeded++;
    else failed++;
  }

  return { retried: claimed, succeeded, failed };
}
