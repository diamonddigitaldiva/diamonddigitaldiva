import { supabase } from "@/integrations/supabase/client";

type HqEvent =
  | {
      type: "quiz_completed";
      primary_stage: string;
      secondary_stage?: string | null;
    }
  | {
      type: "link_click";
      link_name: string;
      link_url?: string | null;
      primary_stage?: string | null;
      secondary_stage?: string | null;
    }
  | {
      type: "feedback_submitted";
      rating?: number | null;
      has_message?: boolean;
    };

/**
 * Fire-and-forget forward of an event to Elleni's HQ.
 * Failures are logged but never block the user flow.
 */
export function forwardToHQ(event: HqEvent) {
  supabase.functions
    .invoke("forward-to-hq", { body: event })
    .then(({ error }) => {
      if (error) console.error("HQ forward failed:", error);
    });
}
