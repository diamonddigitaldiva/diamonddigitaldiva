import { supabase } from "@/integrations/supabase/client";

/**
 * Legacy-compatible CRM payload. The first eight fields keep their original
 * names and types so existing automations keep working. Versioned data is
 * additive (`assessmentVersion`, `answers`, `result`). No marketing-consent
 * field is sent.
 */
export interface QuizResultPayload {
  firstName: string;
  email: string;
  primaryStage: string;
  secondaryStage: string | null;
  primaryStageUrl: string;
  secondaryStageUrl: string | null;
  timestamp: string;
  source: string;
  assessmentVersion?: string;
  answers?: Record<string, unknown>;
  result?: Record<string, unknown>;
}

/**
 * What actually happened to the submission.
 * - saved: stored in our database
 * - delivered: accepted by the CRM webhook (the legacy `success`)
 * - queued: saved but not delivered; the scheduled retry job will resend it
 */
export interface SubmissionOutcome {
  saved: boolean;
  delivered: boolean;
  queued: boolean;
}

const FAILED: SubmissionOutcome = { saved: false, delivered: false, queued: false };

function readOutcome(body: unknown): SubmissionOutcome {
  if (!body || typeof body !== "object") return FAILED;
  const b = body as Record<string, unknown>;
  const delivered = b.delivered === true || (b.delivered === undefined && b.success === true);
  return { saved: b.saved === true, delivered, queued: b.queued === true };
}

export async function sendQuizResultsToWebhook(payload: QuizResultPayload): Promise<SubmissionOutcome> {
  try {
    const { data, error } = await supabase.functions.invoke("send-webhook", { body: payload });
    if (error) {
      // Non-2xx: the body may still say the result was saved.
      const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
      if (ctx && typeof ctx.json === "function") {
        try {
          return readOutcome(await ctx.json());
        } catch {
          /* fall through */
        }
      }
      if (import.meta.env.DEV) console.error("Edge function error occurred");
      return FAILED;
    }
    return readOutcome(data);
  } catch {
    if (import.meta.env.DEV) console.error("Quiz submission error occurred");
    return FAILED;
  }
}
