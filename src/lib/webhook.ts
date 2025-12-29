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
  console.log("Sending quiz results via edge function:", JSON.stringify(payload, null, 2));

  try {
    const { data, error } = await supabase.functions.invoke('send-webhook', {
      body: payload,
    });

    if (error) {
      console.error("Edge function error:", error);
      return false;
    }

    console.log("Edge function response:", data);
    
    if (data?.success) {
      console.log("Webhook sent successfully via edge function");
      return true;
    } else {
      console.error("Webhook failed:", data?.error);
      return false;
    }
  } catch (error) {
    console.error("Error calling edge function:", error);
    return false;
  }
}
