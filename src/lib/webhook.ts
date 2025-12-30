import { supabase } from "@/integrations/supabase/client";

export interface QuizResultPayload {
  firstName: string;
  email: string;
  primaryStage: string;
  secondaryStage: string | null;
  primaryStageUrl: string;
  secondaryStageUrl: string | null;
  timestamp: string;
  source: string;
}

export async function sendQuizResultsToWebhook(
  payload: QuizResultPayload
): Promise<boolean> {
  // Only log non-sensitive info in development
  if (import.meta.env.DEV) {
    console.log("Quiz submission initiated");
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-webhook', {
      body: payload,
    });

    if (error) {
      // Log generic error message only in development
      if (import.meta.env.DEV) {
        console.error("Edge function error occurred");
      }
      return false;
    }

    if (data?.success) {
      if (import.meta.env.DEV) {
        console.log("Quiz submission completed successfully");
      }
      return true;
    } else {
      if (import.meta.env.DEV) {
        console.error("Quiz submission failed");
      }
      return false;
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Quiz submission error occurred");
    }
    return false;
  }
}
