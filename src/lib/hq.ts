import { supabase } from "@/integrations/supabase/client";

export type HQActivityType =
  | "lead_created"
  | "lead_updated"
  | "session_booked"
  | "session_completed"
  | "sale_created"
  | "sale_updated"
  | "note_added"
  | "task_completed"
  | "report_generated";

export type HQBusiness = "real_estate" | "ddd" | "personal";

export interface HQActivity {
  activity_type: HQActivityType;
  /** Always "map-diagnostic" for this app. */
  source: "map-diagnostic";
  /** 1–500 chars. */
  title: string;
  /** Max 2000 chars. */
  description?: string;
  /** Defaults to "ddd" on the server. */
  business?: HQBusiness;
  metadata?: Record<string, unknown>;
}

export interface HQReportPayload {
  leads?: any[];
  sales?: any[];
  sessions?: any[];
  activity?: HQActivity[];
  signups?: any[];
  tasks?: any[];
}

export async function hqReport(payload: HQReportPayload) {
  try {
    const { error } = await supabase.functions.invoke("report-to-hq", {
      body: payload,
    });
    if (error) console.warn("HQ report failed", error);
  } catch (e) {
    console.warn("HQ report failed", e);
  }
}

/** Convenience helper: report a single activity event with the right defaults. */
export function hqActivity(entry: Omit<HQActivity, "source"> & { source?: "map-diagnostic" }) {
  return hqReport({
    activity: [{ business: "ddd", source: "map-diagnostic", ...entry }],
  });
}
