/**
 * Server-side v3 handling. The client's v3 `result` is never trusted: answers
 * are validated with the shared definition and the result is re-derived with
 * the shared engine. Returns null for malformed or incomplete answers; the
 * caller (submission.ts) then rejects the whole request with 400 before any
 * write or send.
 */
import {
  CATALOG_NOT_LOADED,
  MAP_V3_VERSION,
  buildResultV3,
  legacyFieldsV3,
  resultSnapshotV3,
  type V3Answers,
  type V3CatalogSource,
} from "../_shared/map-v3/index.ts";

export interface V3Sanitized {
  fields: { assessmentVersion: string; answers: V3Answers; result: Record<string, unknown> };
  legacy: { primaryStage: string; secondaryStage: string | null; primaryStageUrl: string; secondaryStageUrl: string | null };
}

export const isV3Version = (v: unknown) => typeof v === "string" && v.startsWith("map-v3");

/**
 * `catalog` is the server's own read of the public CAH feed. When it is
 * unavailable the stored result simply has no paid suggestions; the client's
 * resource list is never trusted or copied.
 */
export function sanitizeV3(raw: Record<string, unknown>, catalog: V3CatalogSource = CATALOG_NOT_LOADED): V3Sanitized | null {
  if (raw.assessmentVersion !== MAP_V3_VERSION) return null;
  const built = buildResultV3(raw.answers, catalog);
  if (!built.ok || !built.result) return null;
  const r = built.result;
  return {
    fields: { assessmentVersion: MAP_V3_VERSION, answers: r.answers, result: resultSnapshotV3(r) as Record<string, unknown> },
    legacy: legacyFieldsV3(r),
  };
}
