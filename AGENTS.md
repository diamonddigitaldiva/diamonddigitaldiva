# AGENTS.md

- The live assessment is v3 in `supabase/functions/_shared/map-v3` (definition, catalog, engine), re-exported to the app via `src/lib/assessment/v3.ts`; it is shared so `send-webhook` re-derives trusted results from validated answers (relative `.ts` imports only, no `@/`).
- `src/lib/assessment` (v2) and `src/lib/quizData.ts` (v1) stay for old records and server validation only; they must never feed live scoring.
- Never rename or reuse an assessment question/option/row ID; publish a new version instead, because old submissions are stored by ID. Question order, conditions and scoring live in code only.
- Conditional questions use `showIf` on earlier answers only; client and server both prune hidden answers (`pruneV3`/`validateV3`), so stale answers are never scored.
- Admins edit wording only through `assessment_text_overrides` per version (`applyV3TextOverrides` ignores unknown keys; owned-resource names are catalog names and not overridable).
- Recommendations come only from the curated catalog adapter (with last-reviewed date); there is no live CAH sync, so don't claim one. See `docs/map-v3-cah-integration-gap.md` for the planned read-only feed.
- Catalog filtering keeps product status, CAH listing state and link verification separate; an archived listing or retired URL never by itself marks a product discontinued.
- v3 paid items must be on the owner shortlist with evidenced scope; unverified prices are never treated as within budget; free-only shows only owner-stated free items; device/plan prerequisites exclude items and unknown devices never count as a computer.
- Outbound recommendation links use CAH `/resources/{id}` or an exact owner-approved link (`V3_OWNER_LINKS`; v2 mirror in `send-webhook/v2.ts`); retired URLs are never routed; never put personal data in URLs (the handoff carries only an opaque session ID).
- CRM webhook payloads keep the legacy field names/types; versioned data is additive under `assessmentVersion`, `answers`, `result`; unknown versions are dropped, because existing automations read the old fields.
- Draft progress is stored per version in localStorage (answers only, never name/email) and cleared on result.
- Schema changes are additive only (nullable columns, new tables); `assessment_version` NULL means legacy v1.
- HQ forwarding goes only through the `forward-to-hq` edge function with its allow-listed schema; the HQ token stays server-side.
- Tests: `npx vitest run` (app) and `deno test --allow-env --allow-net` in `supabase/functions` (edge validation); tests must never call the real CRM webhook or HQ.
