import type { V3Question } from "../../../supabase/functions/_shared/map-v3/index.ts";
import { MAX_OVERRIDE_LENGTH, overrideKey } from "./overrides";

/** Override key for a v3 helper line. */
export const helperKey = (questionId: string) => `${questionId}.helper`;

/**
 * Applies admin wording overrides to v3 questions. Wording only: IDs, order,
 * conditions and scoring never change. Other versions, unknown keys and empty
 * or oversized text are ignored. Owned-resource names are catalog names and
 * are not overridable.
 */
export function applyV3TextOverrides(questions: V3Question[], overrides: unknown, version: string): V3Question[] {
  const map = new Map<string, string>();
  if (Array.isArray(overrides)) {
    for (const o of overrides as { assessment_version?: unknown; item_key?: unknown; text?: unknown }[]) {
      if (!o || o.assessment_version !== version) continue;
      if (typeof o.item_key !== "string" || typeof o.text !== "string") continue;
      const t = o.text.trim();
      if (!t || t.length > MAX_OVERRIDE_LENGTH) continue;
      map.set(o.item_key, t);
    }
  }
  return questions.map((q) => ({
    ...q,
    text: map.get(overrideKey(q.id)) ?? q.text,
    helper: q.helper ? (map.get(helperKey(q.id)) ?? q.helper) : q.helper,
    options: q.options.map((opt) =>
      q.kind === "owned" && opt.id.startsWith("res_")
        ? opt
        : { ...opt, label: map.get(overrideKey(q.id, opt.id)) ?? opt.label }
    ),
    rows: q.rows?.map((r) => ({ ...r, label: map.get(overrideKey(q.id, r.id)) ?? r.label })),
  }));
}
