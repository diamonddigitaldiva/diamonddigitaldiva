import { supabase } from "@/integrations/supabase/client";

export const CREATOR_ACCESS_HUB_URL = "https://creatoraccesshub.diamonddigitaldiva.com";

export interface HandoffPayload {
  firstName: string;
  email: string;
  primaryStage: string;
  primaryStageName?: string | null;
  primaryStageUrl?: string | null;
  secondaryStage?: string | null;
  secondaryStageName?: string | null;
  secondaryStageUrl?: string | null;
  assessmentVersion?: string | null;
}

export interface HandoffResult {
  url: string;
  /** true when a session was created and the Hub can read the results. */
  attached: boolean;
}

/**
 * Creates a short-lived (2h) handoff session in the shared backend. Only
 * call this after the person has consented to sharing.
 *
 * The URL carries only an opaque session ID, never a name or email. If the
 * session can't be created, returns the plain Hub URL with attached=false so
 * the UI can say the results were not attached.
 */
export async function createCreatorAccessHubHandoff(payload: HandoffPayload): Promise<HandoffResult> {
  try {
    const { data, error } = await supabase
      .from("handoff_sessions")
      .insert({
        first_name: payload.firstName,
        email: payload.email,
        primary_stage: payload.primaryStage,
        primary_stage_name: payload.primaryStageName ?? null,
        primary_stage_url: payload.primaryStageUrl ?? null,
        secondary_stage: payload.secondaryStage ?? null,
        secondary_stage_name: payload.secondaryStageName ?? null,
        secondary_stage_url: payload.secondaryStageUrl ?? null,
        assessment_version: payload.assessmentVersion ?? null,
        source: "map-diagnostic",
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      console.error("Handoff session create failed");
      return { url: CREATOR_ACCESS_HUB_URL, attached: false };
    }

    return { url: `${CREATOR_ACCESS_HUB_URL}/?session=${encodeURIComponent(data.id)}`, attached: true };
  } catch {
    console.error("Handoff session unexpected error");
    return { url: CREATOR_ACCESS_HUB_URL, attached: false };
  }
}
