# Roadmap

## MAP v3 (map-v3.0) — preview only, do not publish
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

## Earlier (done)
- [x] MAP v2 refresh, DWA owner correction, pop-up blocker note

## Blocked on owner
- [ ] Sender name/address for result email
- [ ] CAH per-offer MAP eligibility metadata + read-only catalog feed (CAH-side)
- [ ] Decision Point waitlist link (no verified destination yet)
- [ ] CRM-side marketing enrollment for MAP leads is unverified (CRM workflows not inspected or changed); confirm the CRM does not auto-subscribe leads without consent before publish
- [ ] Destinations for Passive by Design, Pin Prompt & Profit, After the Avatar (CAH); Quote Society / Insta Expand pending; Offer Fix scope
