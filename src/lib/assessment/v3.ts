/**
 * The live MAP assessment (map-v3.0). The definition, catalog and engine are
 * shared with the send-webhook edge function, which re-derives results.
 */
export * from "../../../supabase/functions/_shared/map-v3/index.ts";
export { applyV3TextOverrides } from "./v3Overrides";
