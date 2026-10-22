# Roadmap

## MAP v2 refresh (preview only, do not publish)
- [x] Versioned v2 assessment: stable question/option IDs, avenue vs bottleneck, deterministic scoring, tie/unsure/conflict handling
- [x] Curated CAH catalog adapter (last reviewed date, exclusions, eligibility, no live sync claim)
- [x] Result screen: reasons from answers, one action, short plan, up to 2 optional resources, creator path
- [x] Consent handoff + plain "Browse CAH" when declined; session failure messaging; no misleading email claims
- [x] Intro + lead copy refresh
- [x] Legacy v1 preserved (DB questions/links labelled legacy, cannot override v2); admin wording overrides for v2
- [x] Additive versioned storage (quiz_submissions, link_clicks, handoff_sessions) + webhook/HQ compatibility
- [x] Result email draft (docs/)
- [x] Tests: scoring, incomplete, ties, no-spend, retired exclusion, navigation, consent, catalog fallback

- [x] Owner correction: DWA live; product status, CAH listing and link verification tracked separately; never route to /resources/dwa

## Blocked on owner
- [ ] Confirm DWA owner link destination (Commas DWA English 4.0) and DWA scope mapping (avenue/priorities are provisional)
- [ ] Sender name/address for result email (pending owner)
- [ ] DDD colour palette confirmation (pending owner)
- [ ] CAH reading v2 handoff fields (primary_stage now a priority ID) — CAH-side change
- [ ] LeadConnector template update to use v2 `result` fields — not enabled from here
