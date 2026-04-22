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
}

/**
 * Creates a short-lived (2h) handoff session in the shared backend and
 * returns a URL that the Creator Access Hub can read by `?session=<uuid>`.
 *
 * If session creation fails for any reason, we still return a safe fallback
 * URL so the user is never blocked from reaching the Hub.
 */
export async function createCreatorAccessHubHandoffUrl(
  payload: HandoffPayload
): Promise<string> {
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
        source: "map-diagnostic",
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      console.error("Handoff session create failed");
      return CREATOR_ACCESS_HUB_URL;
    }

    return `${CREATOR_ACCESS_HUB_URL}/?session=${data.id}`;
  } catch (err) {
    console.error("Handoff session unexpected error");
    return CREATOR_ACCESS_HUB_URL;
  }
}
