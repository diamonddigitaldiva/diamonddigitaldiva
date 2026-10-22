import type { AssessmentQuestion } from "./questions";

export interface TextOverride {
  assessment_version: string;
  item_key: string;
  text: string;
}

export const MAX_OVERRIDE_LENGTH = 300;

/** Item key for a question's text or one of its option labels. */
export function overrideKey(questionId: string, optionId?: string): string {
  return optionId ? `${questionId}.${optionId}` : questionId;
}

/**
 * Applies admin wording overrides. Only wording changes: IDs, order and
 * scoring are untouched. Overrides for another version, unknown keys, and
 * empty or oversized text are ignored, so bad data can never break scoring.
 */
export function applyTextOverrides(
  questions: AssessmentQuestion[],
  overrides: unknown,
  version: string
): AssessmentQuestion[] {
  const map = new Map<string, string>();
  if (Array.isArray(overrides)) {
    for (const o of overrides as Partial<TextOverride>[]) {
      if (!o || o.assessment_version !== version) continue;
      if (typeof o.item_key !== "string" || typeof o.text !== "string") continue;
      const t = o.text.trim();
      if (!t || t.length > MAX_OVERRIDE_LENGTH) continue;
      map.set(o.item_key, t);
    }
  }
  return questions.map((q) => ({
    id: q.id,
    text: map.get(overrideKey(q.id)) ?? q.text,
    options: q.options.map((opt) => ({
      id: opt.id,
      label: map.get(overrideKey(q.id, opt.id)) ?? opt.label,
    })),
  }));
}
