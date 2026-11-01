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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const opt = (v: string | null | undefined) => (v == null ? undefined : v);

/**
 * Creates a short-lived (2h) handoff session in the shared backend. Only
 * call this after the person has consented to sharing.
 *
 * Guests can't read handoff_sessions, so the session is created through the
 * `create_handoff_session` function, which validates the input and returns
 * only the opaque session ID. The URL carries only that ID, never a name or
 * email. If the session can't be created, returns the plain Hub URL with
 * attached=false so the UI can say the results were not attached.
 */
export async function createCreatorAccessHubHandoff(payload: HandoffPayload): Promise<HandoffResult> {
  try {
    const { data, error } = await supabase.rpc("create_handoff_session", {
      _first_name: payload.firstName,
      _email: payload.email,
      _primary_stage: payload.primaryStage,
      _primary_stage_name: opt(payload.primaryStageName),
      _primary_stage_url: opt(payload.primaryStageUrl),
      _secondary_stage: opt(payload.secondaryStage),
      _secondary_stage_name: opt(payload.secondaryStageName),
      _secondary_stage_url: opt(payload.secondaryStageUrl),
      _assessment_version: opt(payload.assessmentVersion),
    });

    if (error || typeof data !== "string" || !UUID_RE.test(data)) {
      console.error("Handoff session create failed");
      return { url: CREATOR_ACCESS_HUB_URL, attached: false };
    }

    return { url: `${CREATOR_ACCESS_HUB_URL}/?session=${encodeURIComponent(data)}`, attached: true };
  } catch {
    console.error("Handoff session unexpected error");
    return { url: CREATOR_ACCESS_HUB_URL, attached: false };
  }
}
