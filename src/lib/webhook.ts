import { supabase } from "@/integrations/supabase/client";

/**
 * Legacy-compatible CRM payload. The first eight fields keep their original
 * names and types so existing automations keep working. v2 data is additive
 * and versioned (`assessmentVersion`, `answers`, `result`).
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
  answers?: Record<string, string>;
  result?: Record<string, unknown>;
}

export async function sendQuizResultsToWebhook(payload: QuizResultPayload): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("send-webhook", { body: payload });
    if (error) {
      if (import.meta.env.DEV) console.error("Edge function error occurred");
      return false;
    }
    return Boolean(data?.success);
  } catch {
    if (import.meta.env.DEV) console.error("Quiz submission error occurred");
    return false;
  }
}
