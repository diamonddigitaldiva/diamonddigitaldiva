# MAP v3 ↔ Creator Access Hub integration

Updated 2026-11-02. Written from The MAP project only. Nothing in CAH (products, prices, statuses, metadata) was changed from here.

## Catalog: CAH → MAP (built)
- **Source:** the public, read-only CAH feed `GET https://creatoraccesshub.diamonddigitaldiva.com/api/public/map/catalog/v1`, contract `cah-map-catalog/v1`. CAH builds it from owner-reviewed `offer_map_metadata` (only `map_eligible` and reviewed rows that are active, not coming soon, not being updated, not sold out and have a usable link). No key, no cookies, no scraping. The response is `no-store` with `Access-Control-Allow-Origin: *`.
- **Adapter:** `supabase/functions/_shared/map-v3/feed.ts`. The browser (`src/lib/assessment/cahCatalog.ts`, 5-minute reuse of a good read) and `send-webhook` (60-second reuse) use the same code, so the result someone sees and the result saved on the server follow the same rules. The server never trusts the browser's resource list.
- **Hard limits:** 6-second timeout, 512 KB maximum, strict envelope check (contract, `generated_at`, `count` equal to the number of items). If anything fails, the feed counts as **unavailable**.
- **When the feed is unavailable:** no paid product is suggested. The person still gets their full result and free plan, a note that the Hub's list couldn't be loaded, and a plain "Browse the Creator Access Hub" link. A failed read is never cached, and there's no older or hardcoded list to fall back on. The free community (Monetize What You Know) is a MAP-owned free link, so it can still appear for people who are unsure.
- **Per-item rules (fail closed):**
  - It must be on the MAP allowlist (`V3_MAP_ALLOWLIST`, the 17 products the owner reviewed). **New CAH products are never eligible automatically.**
  - `V3_MAP_BLOCKED` always wins: 4 Fig Days (sold out; this is a different product from 4-Figure Clients), The Offer Fix (scope not established), Quote Society and Insta Expand (pending), and The Decision Point (waitlist only).
  - It must have `map_preferred: true`, `listing.state: active`, `availability.state: available` and must not be coming soon or being updated. Sold out is always dropped.
  - It must have a summary, recognised paths/gaps/roles and only known prerequisites. An unknown prerequisite drops the item. Summaries with strong promise wording are dropped.
  - Links: a CAH resource link must be exactly `/resources/{id}`. An external link must be an exact owner-approved link (DWA's Fanbasis link). Retired CAH pages (for example `/resources/dwa` and `/resources/ata`) are never used. Links that failed verification are dropped.
  - Prices count as verified only when they're verified, in USD and one-time. Recurring, other-currency or unverified prices are "unverified", so a capped budget leaves them out.
  - Ownership: `owned_aliases` and The MAP's own owned list both suppress items the person already owns. `included_in` (for example Prompt to Sales inside The Secret Sauce) suppresses bundle duplicates. The 4 Fig Days and 4 Fig Clients ownership answers are still recognised.
  - Affiliate: `rel="sponsored"` comes only from the feed's `affiliate` flag. The disclosure is shown before the cards whenever an affiliate card is shown.
  - Order is The MAP's editorial allowlist order (ties only, never commission). `kind` (training or tool) is The MAP's classification, so tools are never shown as a business model.
- **Provenance:** each v3 result and snapshot records `catalog: { source: "cah-feed" | "unavailable" | "supplied", generatedAt }`.
- **Feed on 2026-11-02 (17 items, all accepted):** dwa, cfw, aica, aifluencer-studio, ai-to-sales, faceless-launch, 0-first-sale-challenge, selling-made-simple, daily-sales-rhythm, 100k-threads-challenge, tss, paid-with-ai, powerhorse-academy, faceless-amazon-kdp-blueprint, ai-podcast-kit-10-min-workflow-x-chatbots-x-100-viral-quot, the-molly-x-rosie-archive, prompt-to-sales. The feed marks all of them as affiliate products. CFW and Faceless Launch are now "price unverified" because the feed reports a price conflict, so they don't show for capped budgets. Titles are CAH's exact titles; only decorative emoji are removed (so "$0 → FIRST SALE CHALLENGE").
- **Tests:** a verbatim snapshot of that feed is in `_shared/map-v3/testdata/cahFeedSnapshot.ts`. Tests never call the network. They cover an empty feed, removal, sold out, coming soon or being updated, timeouts, HTTP and JSON errors, oversized bodies, new or not-preferred products, blocked IDs, retired, mismatched or unapproved links, unknown prerequisites and recurring prices.

## Handoff: MAP → CAH (verified for compatibility)
- With Hub-sharing consent, The MAP calls the validated `create_handoff_session` function. It writes a 2-hour `handoff_sessions` row and returns only its ID. The Hub URL is `/?session=<uuid>`, with no name, email or other parameters. Without consent, the plain Hub URL has no query at all.
- CAH (`src/lib/map/handoffV3.ts`, `handoff.functions.ts`) reads the session on its server through `get_handoff_session`, using The MAP's publishable key (`MAP_HANDOFF_URL` / `MAP_HANDOFF_PUBLISHABLE_KEY`). It accepts only known v3 focus IDs, keeps only those, removes the session from the address bar and shows nothing for invalid, unknown or expired sessions. Old v1/v2 codes map to nothing.
- **Checks (2026-11-02):**
  - A verbatim copy of CAH's receiver rules (`src/lib/__fixtures__/cahHandoffV3.snapshot.ts`) confirms that all 21 v3 focus IDs, their labels and their creator paths match.
  - A synthetic database check that was rolled back created a session, read it (`message`/`publishing`), consumed it, expired it (no row, consume returns false) and had an invalid stage rejected. No rows remain.
  - A read-only call to `get_handoff_session`, the same call CAH makes, with an unknown ID returned `[]` (CAH shows nothing). An invalid ID returned 400, and CAH validates IDs before calling.
- **CAH receiver status (CAH read, 2026-11-02):** `MAP_HANDOFF_URL` and `MAP_HANDOFF_PUBLISHABLE_KEY` are not set in CAH yet, so CAH currently ignores `?session`. The MAP side needs no change.
- **Shared functions (The MAP's database; `anon` and `authenticated` may run them):**
  - `get_handoff_session(_session_id uuid)` is read-only. It returns a table (`id, first_name, email, primary_stage, primary_stage_name, primary_stage_url, secondary_stage, secondary_stage_name, secondary_stage_url, source, created_at, expires_at, consumed_at`) only while `expires_at > now()`; otherwise it returns zero rows. This is the only function CAH calls.
  - `consume_handoff_session(_session_id uuid) → boolean` marks the session consumed (true only if unexpired). CAH doesn't use it, and it isn't needed.
  - `create_handoff_session(...) → uuid` is used by The MAP only.
- **CAH setup (server-side secrets only, never `VITE_`):**
  - Set `MAP_HANDOFF_URL` to The MAP's public backend address (https, no trailing path).
  - Set `MAP_HANDOFF_PUBLISHABLE_KEY` to The MAP's public `anon` key. It's the same key already shipped in The MAP's site, and it isn't a privileged key.
  - CAH then POSTs `{base}/rest/v1/rpc/get_handoff_session` with `{"_session_id": "<uuid>"}`. The key is an older JWT-style key, not `sb_`, so CAH's code also sends it as Bearer.
  - Expect `200 []` for an unknown or expired session (CAH shows nothing) and `400` for a malformed ID (CAH validates the ID first).
  - Never give CAH a service-role key or the database password.
 `get_handoff_session` still returns first name and email to anyone who holds a live session ID (2-hour window, unguessable UUID). CAH discards them. Narrowing that function to focus fields only is a recommended follow-up, timed with CAH, because CAH calls it.

## Offer: MAP → The Decision Point (verified 2026-11-06)
- When a v3 result carries the Decision Point note (discover/focus-gap/unsure, not a free-only budget), the result page shows "Continue to The Decision Point — $17". The click calls `send-webhook` with mode `decision_point_offer` and the answers only — no name or email.
- The server rebuilds the result from the answers against the live feed. Only if the rebuilt result still recommends The Decision Point does it insert a `decision_point_offers` row (opaque token, assessment version, primary focus, price 1700) and return `https://thedecisionpoint.diamonddigitaldiva.com/?map_offer=<token>` with amount 1700 / regular 2700. Otherwise it returns 400. The browser accepts only that exact URL prefix.
- `get_decision_point_offer(_token uuid)` (SECURITY DEFINER; `anon` may run it) returns `{eligible: true, amount: 1700, currency: "usd", regular_amount: 2700}` for a known token, else `eligible: false` at the full 2700. Tokens do not expire.
- **Checks (2026-11-06, no personal data, no checkout):** qualifying answers → 200 + offer URL; free-only budget → 400; real token → `eligible: true`; unknown token → `eligible: false`. The test token row was deleted afterwards.
- The earlier "table does not exist" failure is resolved: `decision_point_offers` exists in the live database with RLS on and no public policies; only the server (service role) writes it.
- **Decision Point side (not verified from here):** it must read `map_offer` from the URL and call `get_decision_point_offer` with The MAP's publishable key to apply the $17 price.

## Still open
- **CAH-side:** Passive by Design, Pin Prompt & Profit and After the Avatar aren't in the feed (not MAP-eligible in CAH). If the owner later makes them eligible in CAH, they also need adding to `V3_MAP_ALLOWLIST`, which is a deliberate MAP-side step. Passive by Design also needs the paid-Claude question shown to digital-products and affiliate respondents. Until then the engine leaves it out.
- **4 Fig Days:** the CAH audit (2026-11-02) shows it as `sold_out = true`, a pending placeholder with no link or price, correctly hidden from the feed. The MAP also blocks its IDs and keeps the ownership answer. The missing link is an owner task, not a MAP blocker. 4-Figure Clients is a separate product and isn't on The MAP's list.
- **Server feed read in production:** tests use fakes. The deployed `send-webhook` reading the feed from the server environment hasn't been exercised with a real submission, because no test leads are sent.
- **Prices still unverified in the feed:** CFW, Faceless Launch, Secret Sauce, Paid with AI, Powerhorse Academy, Faceless Amazon KDP Blueprint and Prompt to Sales.
- **CRM:** delivery is at least once (no verified idempotency). How CRM workflows use `marketingConsent` is unverified, and new v3 leads without consent are never forwarded.
- **Device notes:** Chromebook doesn't count as Mac/Windows. Device needs for AICA and KDP aren't in the feed, so phone users aren't excluded from them.
