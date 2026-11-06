# Roadmap

## MAP v3 (map-v3.0) — owner authorized finishing; owner deploys after review
- [x] Shared v3 definition (questions, conditions, validation) usable by app and server
- [x] v3 deterministic engine: start / improve / expand / pivot, ties reported, max one alternate
- [x] v3 catalog: owner shortlist for owned-resource selector, conservative eligibility (devices, Claude plan, outreach, owned, budget, pending)
- [x] Quiz UI: single, multi (exclusive, max two), comfort rows, owned search + custom text, optional note; pruning; progress; draft save
- [x] Result screen v3 + intro copy; handoff, browse link and pop-up note kept
- [x] Server: send-webhook rederives v3 results; v2 still accepted; legacy fields kept
- [x] Admin wording overrides + catalog table for v3
- [x] Tests (app + edge) and CAH integration gap report

## Corrections after owner audit (done)
- [x] Capped budget excludes unverified prices; owner-supplied profiles added; DWA/AICA/CFW/Secret Sauce updated; Offer Fix scope unestablished; drafts never save free text

## Runtime corrections after owner audit (done)
- [x] Handoff session created via validated `create_handoff_session` RPC returning only the ID (guests still cannot read sessions)
- [x] Result page shows real saving status; failed save warns, keeps result and draft, explicit limited retry
- [x] send-webhook saves before CRM delivery; reports saved/delivered/queued; rejects malformed declared v3 and unknown versions with 400
- [x] Lead form: service-only wording, no marketing-enrollment claim; payload carries no marketing consent

## Retry reliability (done)
- [x] One retry schedule (every 10 min) active; duplicate 15-min schedule paused, not deleted
- [x] Quiz retries claim rows atomically, max 10 attempts, lock released on failure, bounded 20s post timeout; initial send holds the lock

## Consent and disclosure (done)
- [x] Affiliate disclosure before resource links; rel="sponsored" for evidenced affiliate links (DWA only)
- [x] Product summaries describe training, no outcome promises; titles kept exact
- [x] Optional unchecked marketing checkbox; explicit consent stored with server time/source/version
- [x] New v3 leads without consent saved in the app only, never sent to the CRM or retried; v1/v2 unchanged

## Live CAH catalog + handoff verification (done, 2026-11-02)
- [x] Public CAH feed adapter shared by browser and send-webhook; hardcoded product list removed
- [x] MAP allowlist (no auto-eligibility), blocked IDs (4 Fig Days sold out, Offer Fix, pending, Decision Point), fail-closed validation
- [x] Feed unavailable/invalid/timeout: free plan + plain Hub link, no stale purchase links
- [x] Admin view of the live feed and what The MAP does with each item
- [x] Handoff contract checked against CAH receiver (synthetic, rolled back); tests, desktop/phone browser checks

## Decision Point $17 offer (verified 2026-11-06)
- [x] decision_point_offers table exists live; earlier nonexistent-table failure resolved
- [x] Live checks: qualifying answers → token + $17 URL; free-only → 400; token lookup eligible true/false; test row deleted
- [x] CAH handoff contract re-verified (signatures, grants, unknown-session []); no guest SELECT on handoff_sessions
- [x] Stale tests updated after owner edits (waitlist note → $17 offer note; guidance line rejoined)

## Earlier (done)
- [x] MAP v2 refresh, DWA owner correction, pop-up blocker note

## Blocked on owner
- [ ] Sender name/address for result email
- [ ] Decision Point must read `map_offer` from the URL and call `get_decision_point_offer` to apply the $17 price (DP-side, not verified from MAP)
- [ ] CRM-side handling of the new `marketingConsent` flag is unverified (CRM workflows not inspected or changed); configure the CRM to use it before publish
- [ ] Production publish: owner deploys after review
- [ ] Recommended: narrow get_handoff_session to focus fields (coordinate with CAH)
- [ ] CAH sets MAP_HANDOFF_URL / MAP_HANDOFF_PUBLISHABLE_KEY (CAH-side; values supplied)
- [ ] Destinations for Passive by Design, Pin Prompt & Profit, After the Avatar (CAH); Quote Society / Insta Expand pending; Offer Fix scope
