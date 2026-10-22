# AGENTS.md

- The live assessment is `src/lib/assessment` (versioned via `ASSESSMENT_VERSION`); question/option IDs, order and scoring live in code only, because stored answers must stay interpretable.
- Never rename or reuse an assessment question/option ID; publish a new version instead, because old submissions are stored by ID.
- Legacy v1 (`src/lib/quizData.ts`, `quiz_questions`, `stage_links`) is kept for old records only and must never feed live scoring or recommendations.
- Admins may only edit v2 wording through `assessment_text_overrides`; overrides are applied by `applyTextOverrides`, which ignores unknown keys, so bad rows can't break scoring.
- Recommendations come only from the curated CAH catalog adapter (`catalog.ts`) with its exclusion list and last-reviewed date; there is no live CAH sync, so don't claim one.
- Outbound recommendation links use CAH `/resources/{id}` and `/creator-paths/{slug}`; never put personal data in URLs (the handoff carries only an opaque session ID).
- CRM webhook payloads keep the legacy field names/types; new data is additive under `assessmentVersion`, `answers`, `result`, because existing automations read the old fields.
- Schema changes are additive only (nullable columns, new tables); `assessment_version` NULL means legacy v1.
- HQ forwarding goes only through the `forward-to-hq` edge function with its allow-listed schema; the HQ token stays server-side.
- Tests: `npx vitest run` (app) and `deno test` in `supabase/functions` (edge validation); tests must never call the real CRM webhook or HQ.
