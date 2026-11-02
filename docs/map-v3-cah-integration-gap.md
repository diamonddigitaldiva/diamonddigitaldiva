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
- **Remaining privacy note:** `get_handoff_session` still returns first name and email to anyone who holds a live session ID (2-hour window, unguessable UUID). CAH discards them. Narrowing that function to focus fields only is a recommended follow-up, timed with CAH, because CAH calls it.

## Still open
- **CAH-side:** Passive by Design, Pin Prompt & Profit and After the Avatar aren't in the feed (not MAP-eligible in CAH). If the owner later makes them eligible in CAH, they also need adding to `V3_MAP_ALLOWLIST`, which is a deliberate MAP-side step. Passive by Design also needs the paid-Claude question shown to digital-products and affiliate respondents. Until then the engine leaves it out.
- **4 Fig Days vs 4-Figure Clients:** the CAH snapshot has a sold-out "4-Figure Clients" row and no "4 Fig Days" row. The MAP blocks 4 Fig Days IDs and doesn't allowlist 4-Figure Clients, so neither can be suggested. The CAH-side labelling should be confirmed by the owner or the CAH investigation.
- **Server feed read in production:** tests use fakes. The deployed `send-webhook` reading the feed from the server environment hasn't been exercised with a real submission, because no test leads are sent.
- **Prices still unverified in the feed:** CFW, Faceless Launch, Secret Sauce, Paid with AI, Powerhorse Academy, Faceless Amazon KDP Blueprint and Prompt to Sales.
- **CRM:** delivery is at least once (no verified idempotency). How CRM workflows use `marketingConsent` is unverified, and new v3 leads without consent are never forwarded.
- **Device notes:** Chromebook doesn't count as Mac/Windows. Device needs for AICA and KDP aren't in the feed, so phone users aren't excluded from them.
