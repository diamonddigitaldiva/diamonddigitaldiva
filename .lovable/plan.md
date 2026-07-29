
# The MAP™ Diagnostic — Read-Only Modernization Audit

No code, data, secrets, or deployments were changed. Findings below come from reading the app, the live database rows, and HTTP-checking every outbound link.

## 1. What the diagnostic actually is today

- **9 questions, 12 options each (A–L), single-select, all required.** `Next` is disabled until an option is picked; `Back` works; no skip, no "none of these", no free text. Progress bar = index/total.
- **No branching at all.** Every user sees the same 9 questions in the same order (`src/components/quiz/QuizScreen.tsx`, `TheMapQuiz.tsx`).
- **Scoring is a flat tally** (`computeResults`, `src/lib/quizData.ts:305`): each chosen letter maps 1:1 to a stage code via `STAGE_MAP`; the stage with the most votes is Primary, second-most is Secondary. No weighting, no thresholds, no confidence score.
- **Screens:** Intro → 9 questions → Lead capture → Result (+ feedback form). Answers are held in React state only — a refresh loses all progress.

**Live data reality check:** `quiz_submissions` = 6 rows total, most recent **2026-02-03**; `link_clicks` = 1 row; `feedback` = 0 rows. There is effectively no traffic and therefore no behavioural evidence for any current design choice.

## 2. Outcomes and product routing

12 outcomes, each routed to one URL. Runtime links come from the `stage_links` table (13 rows incl. `BOUTIQUE`), with the hardcoded `LINKS` map used only as fallback.

| Code | Name shown | Destination host | HTTP check |
|---|---|---|---|
| CFW | The Start Line | stan.store | 200 |
| AICA | The Brain (2.0) | shop.beacons.ai | 403 (unverifiable) |
| MPV | Must-Have Production Vault | shop.beacons.ai | 403 (unverifiable) |
| TACM | The Decoder | stan.store | 200 |
| ATA | The Engine | stan.store | 200 |
| TSA | The OS | stan.store | 200 |
| DWA | The Business | go.diamonddigitaldiva.com | 200 |
| FOC | The Infrastructure | funnelsofcourse.com | 200 |
| TSS | The Secret Sauce | shop.beacons.ai | 403 (unverifiable) |
| TDP | The Decision Point | thedecisionpoint…lovable.app | 200 |
| AIS | AIfluencer Studio | stan.store | 200 |
| CPM | The Pivot Method | shop.beacons.ai | 403 (unverifiable) |
| BOUTIQUE | The Boutique | beacons.ai | 403 (unverifiable) |

The 403s are Cloudflare bot-blocking, not proof of a dead link — but they mean **no beacons.ai destination can be machine-verified; a human must open all five.**

**Upsell layer** (hardcoded only, not in the database, not admin-editable — `STAGE_UPSELLS`, `quizData.ts:276`):
- AICA / AIS → PromptBank, After The Algorithm, OpenArt AI, The Secret Sauce
- CFW / DWA / MPV → Create Launch Sell, The Secret Sauce
- TACM → TSA; TSA → TACM; ATA → After The Algorithm + TACM; TSS → The Faceless Launch
- Plus **FOC appended automatically** to 9 "high-ticket" stages
- **FOC, TDP, CPM have no upsells at all** — those three results show a bare page.

## 3. Catalog problems found

- **Database and code disagree.** `stage_links` points AICA and MPV at beacons.ai URLs; `src/lib/quizData.ts` still hardcodes different stan.store URLs for both. The DB wins at runtime, so the code file is stale and actively misleading.
- **Two different URLs for the same product.** TSS as an outcome → beacons `4f3e423a`; TSS as an upsell → stan `494d42e8`.
- **Naming is inconsistent across surfaces.** TACM is "The Decoder" as an outcome but "The Anti-Clone Method" as an upsell — and a separate product called "The Anti-Clone Decoder" also exists. TSA is "The OS" vs "The Story Advantage". AICA is "The Brain (2.0)" with no explanation of 2.0.
- **FOC is both a primary outcome and a universal upsell**, so some users are sold the thing they were just diagnosed into.
- **Hard-coded assumptions:** the "high-ticket = over $150" rule lives only in a code comment; **no prices exist anywhere in the app**. Affiliate IDs (`am_id=elleni1987`, `ref=kristopher01`) are hardcoded. `BOUTIQUE` is stored but never linked, even though result copy tells users to "browse it directly via the Boutique".
- **`STAGE_MAP` (letter → product) is code-only.** Admins can edit question text and option wording in `/admin`, but if anyone reorders or repurposes an option, the mapping silently misroutes. Options must stay exactly 12, keyed A–L.

## 4. Logic and fatigue issues

- **Ties are resolved by insertion order** — effectively "whichever stage was answered first". Undocumented and invisible to the user; with 9 answers across 12 stages, ties are common (e.g. 2-2-2-2-1).
- **Secondary can be a single vote**, presented with the same visual weight as a 4-vote primary. No minimum threshold.
- **Fallback:** if scoring somehow yields nothing, Primary hard-defaults to `CFW`. Secondary is `null` only when all 9 answers share one letter.
- **Coverage:** all 12 outcomes are reachable, and every question offers all 12 — which means the quiz is 9 near-parallel restatements of the same taxonomy. **108 option reads, 12-item lists per screen.** This is the single biggest decision-fatigue and drop-off risk, and there is no analytics to measure it.
- Answers cannot conflict by design, but they also cannot express nuance — the instrument mostly measures which phrasing a user recognises first.

## 5. UX, accessibility, forms, privacy, performance

- **Accessibility (worst area):** options are `<div onClick>` — not buttons, no `role="radio"`/`radiogroup`, no keyboard focus, no Enter/Space, no `aria-checked`. A keyboard or screen-reader user **cannot complete the quiz.** No fieldset/legend, no `aria-live` on progress, no `aria-label` on star-rating buttons, progress bar has no ARIA attributes.
- **Mobile:** 12 stacked long options per question = heavy scrolling; intro uses scroll-snap plus `clamp(64px,10vw,120px)` headline with many inline styles.
- **Forms/errors:** validation is toast-only (no inline field errors, no `aria-invalid`), email checked with a loose regex client-side. Result renders regardless of whether the webhook succeeded — the user never learns delivery failed.
- **Analytics:** no GA/pixel/step tracking. Only `link_clicks` rows and HQ events. Drop-off is unmeasurable today.
- **Privacy:** Terms/Privacy/Cookies pages exist; Hub consent is an explicit checkbox; marketing-email consent is implied by continuing rather than opted in. Name/email are written client-side into `link_clicks` and `handoff_sessions`.
- **Performance:** small bundle, no heavy media; two Google Font families with wide weight ranges. Not a concern.

## 6. Delivery and integrations

- **Email: the app sends none.** `sendQuizResultsToWebhook` → `send-webhook` edge function (IP rate-limited, validated, writes `quiz_submissions`) → posts to the `LEADCONNECTOR_WEBHOOK_URL` secret. Whether a result email ever arrives depends entirely on the external LeadConnector/GHL automation, which cannot be verified from here. The result page's "Check your inbox for more personalized resources" is currently an **unverified promise**.
- **HQ has two conflicting endpoints.** `forward-to-hq` posts to one HQ project ingest URL; `report-to-hq` and `src/lib/hq.ts` post to a different one. `hqReport`/`hqActivity` are **dead code — imported nowhere.**
- **Likely broken auth on HQ calls:** `supabase/config.toml` declares only `send-webhook` (`verify_jwt=false`) and `retry-webhooks`. `forward-to-hq` and `report-to-hq` are undeclared, so they default to requiring a JWT — but they're invoked by anonymous quiz visitors. Consistent with **zero log entries for every function** and the near-empty tracking tables. Unconfirmed, but the first thing to test.
- Creator Access Hub handoff (`handoff_sessions` → short-lived session URL) is implemented and the Hub domain responds 200.
- Admin exists: submissions list, questions editor, links editor, feedback viewer, manual webhook retry.

## 7. Tests and confidence

**There are no tests of any kind** — no vitest/jest/playwright config, zero test files. Scoring, tie-breaking, DB-vs-fallback behaviour, and webhook delivery are all unverified. **Confidence in current behaviour: low.** Structural confidence is decent (the code is small and readable); confidence that the funnel actually delivers anything to a lead is poor.

## 8. Owner decisions required (nothing invented here)

1. **Authoritative product catalog:** for each of the 12 codes — current public name, live URL, price, and status (active / retired / renamed / hidden).
2. Which of the five beacons.ai destinations are still live and correct (must be checked by hand).
3. Canonical name per product, to end the Decoder/Anti-Clone/OS/Story-Advantage collisions.
4. Whether TSS points to the beacons or the stan listing.
5. Whether FOC should remain both an outcome and a blanket upsell.
6. What FOC, TDP and CPM results should offer, if anything.
7. The real price threshold behind the "high-ticket" rule, or replace it with an explicit per-product flag.
8. Whether the quiz should stay 9×12, or shrink (fewer questions, fewer options per question).
9. Desired tie-break rule and whether a weak Secondary should be suppressed.
10. Who sends the result email — LeadConnector as today, or this app.
11. Which HQ ingest endpoint is canonical.
12. Whether the Boutique should be surfaced as a real link.

## 9. Smallest safe modernization path

Ordered so each step is independently shippable, no rewrite:

1. **Verify delivery end-to-end** (highest value, no content decisions): declare `forward-to-hq` / `report-to-hq` in config with public invocation, converge on one HQ endpoint, delete dead `hq.ts` code, confirm a LeadConnector email actually lands. — **Low**
2. **Fix accessibility of the option list**: real radio-group semantics, keyboard support, focus states, ARIA on progress and stars. — **Low**
3. **Reconcile the catalog**: move upsells into the database next to `stage_links`, delete the stale hardcoded `LINKS`, apply the owner's verified names/URLs, add per-product active flag and price. — **Medium** (blocked on owner data, cheap once supplied)
4. **Harden scoring**: explicit deterministic tie-break, secondary threshold, unit tests for `computeResults`, plus a smoke test for the lead→webhook path. — **Low**
5. **Add step analytics** so drop-off is measurable before any question redesign. — **Low**
6. **Reduce fatigue** (shorten the instrument / cut options per question). — **Medium**, and should not be attempted before step 5 gives data.

**Overall effort: Medium.** Steps 1, 2, 4 and 5 together are **Low** and can be done without a single owner decision.

## 10. Which finishes first — MAP or The Decision Point?

The Decision Point (`48eee4ab-24e8-4b34-9743-c7fa24c8c42a`) is a much larger surface: a paid multi-module course with Stripe checkout, guest checkout and purchase claiming, entitlement grant/revoke admin functions, account deletion, an AI chat companion, i18n, and authored module content. Its code is substantially built out, but the risk surface — payments, entitlements, refunds, auth edge cases — is where the remaining effort hides, and that effort is inherently **High** to finish safely.

**The MAP Diagnostic is the quicker product to complete.** Its remaining work is one scoring file, one catalog table, an accessibility pass, and a delivery verification — all Low-to-Medium and largely gated on the owner supplying verified product data rather than on engineering. Recommendation: finish MAP first as the free top-of-funnel that feeds TDP, then spend the long tail on TDP's commerce paths.
