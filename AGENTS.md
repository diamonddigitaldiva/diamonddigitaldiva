# AGENTS.md

- The live assessment is `src/lib/assessment` (versioned via `ASSESSMENT_VERSION`); question/option IDs, order and scoring live in code only, because stored answers must stay interpretable.
- Never rename or reuse an assessment question/option ID; publish a new version instead, because old submissions are stored by ID.
- Legacy v1 (`src/lib/quizData.ts`, `quiz_questions`, `stage_links`) is kept for old records only and must never feed live scoring or recommendations.
- Admins may only edit v2 wording through `assessment_text_overrides`; overrides are applied by `applyTextOverrides`, which ignores unknown keys, so bad rows can't break scoring.
- Recommendations come only from the curated catalog adapter (`catalog.ts`, with last-reviewed date); there is no live CAH sync, so don't claim one.
- Catalog filtering keeps product status, CAH listing state and link verification separate (`recommendability`); an archived listing or retired URL never by itself marks a product discontinued, because listings auto-archive for link-host reasons.
- Outbound recommendation links use CAH `/resources/{id}` for listed entries, or an exact owner-approved link (`OWNER_APPROVED_LINKS`, mirrored server-side in `send-webhook/v2.ts`); `retiredDestinations` are never routed; never put personal data in URLs (the handoff carries only an opaque session ID).
- CRM webhook payloads keep the legacy field names/types; new data is additive under `assessmentVersion`, `answers`, `result`, because existing automations read the old fields.
- Schema changes are additive only (nullable columns, new tables); `assessment_version` NULL means legacy v1.
- HQ forwarding goes only through the `forward-to-hq` edge function with its allow-listed schema; the HQ token stays server-side.
- Tests: `npx vitest run` (app) and `deno test` in `supabase/functions` (edge validation); tests must never call the real CRM webhook or HQ.
