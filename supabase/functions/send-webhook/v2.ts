/**
 * Validation for the additive, versioned v2 fields on quiz submissions.
 * Legacy fields are validated in index.ts and are unchanged. If any v2 field
 * is malformed, all v2 data is dropped (never blocks the lead).
 */

export const CAH_PREFIX = "https://creatoraccesshub.diamonddigitaldiva.com/";

const VERSION_RE = /^[a-z0-9][a-z0-9.\-]{0,39}$/;
const ID_RE = /^[a-z0-9_]{1,60}$/;
const SLUG_RE = /^[a-z0-9-]{1,60}$/;

export interface V2Fields {
  assessmentVersion: string;
  answers: Record<string, string>;
  result: Record<string, unknown>;
}

const str = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= max;
const nullableId = (v: unknown) => v === null || (typeof v === "string" && ID_RE.test(v));
const cahUrl = (v: unknown): v is string =>
  typeof v === "string" && v.length <= 300 && v.startsWith(CAH_PREFIX) && !v.includes("?") && !v.includes("#");

export function sanitizeV2(raw: Record<string, unknown>): V2Fields | null {
  const { assessmentVersion, answers, result } = raw;
  if (assessmentVersion === undefined && answers === undefined && result === undefined) return null;
  if (typeof assessmentVersion !== "string" || !VERSION_RE.test(assessmentVersion)) return null;

  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return null;
  const ansEntries = Object.entries(answers as Record<string, unknown>);
  if (ansEntries.length === 0 || ansEntries.length > 20) return null;
  const cleanAnswers: Record<string, string> = {};
  for (const [k, v] of ansEntries) {
    if (!ID_RE.test(k) || typeof v !== "string" || !ID_RE.test(v)) return null;
    cleanAnswers[k] = v;
  }

  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  const r = result as Record<string, unknown>;
  if (r.version !== assessmentVersion) return null;
  if (!ID_RE.test(String(r.priority ?? ""))) return null;
  if (!str(r.priorityLabel, 120)) return null;
  if (!nullableId(r.secondaryPriority ?? null)) return null;
  if (!nullableId(r.avenue ?? null)) return null;
  if (!str(r.avenueLabel, 120)) return null;
  if (!ID_RE.test(String(r.stage ?? ""))) return null;
  if (!str(r.stageLabel, 60)) return null;
  if (!ID_RE.test(String(r.spend ?? ""))) return null;
  if (!str(r.immediateAction, 600)) return null;
  if (!str(r.planHorizon, 120)) return null;

  const tied = Array.isArray(r.tiedWith) ? r.tiedWith : [];
  if (tied.length > 7 || !tied.every((t) => typeof t === "string" && ID_RE.test(t))) return null;

  const steps = r.planSteps;
  if (!Array.isArray(steps) || steps.length > 5 || !steps.every((s) => str(s, 400))) return null;

  const resources = r.resources;
  if (!Array.isArray(resources) || resources.length > 2) return null;
  const cleanResources: { id: string; name: string; url: string }[] = [];
  for (const x of resources) {
    const o = x as Record<string, unknown>;
    if (!o || !SLUG_RE.test(String(o.id ?? "")) || !str(o.name, 120) || !cahUrl(o.url)) return null;
    cleanResources.push({ id: o.id as string, name: o.name as string, url: o.url as string });
  }

  let creatorPath: { slug: string; label: string; url: string } | null = null;
  if (r.creatorPath !== null && r.creatorPath !== undefined) {
    const c = r.creatorPath as Record<string, unknown>;
    if (!SLUG_RE.test(String(c.slug ?? "")) || !str(c.label, 80) || !cahUrl(c.url)) return null;
    creatorPath = { slug: c.slug as string, label: c.label as string, url: c.url as string };
  }

  return {
    assessmentVersion,
    answers: cleanAnswers,
    result: {
      version: assessmentVersion,
      priority: r.priority,
      priorityLabel: r.priorityLabel,
      secondaryPriority: r.secondaryPriority ?? null,
      tiedWith: tied,
      avenue: r.avenue ?? null,
      avenueLabel: r.avenueLabel,
      stage: r.stage,
      stageLabel: r.stageLabel,
      spend: r.spend,
      immediateAction: r.immediateAction,
      planHorizon: r.planHorizon,
      planSteps: steps,
      resources: cleanResources,
      creatorPath,
    },
  };
}
