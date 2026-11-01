# MAP v3 ↔ Creator Access Hub: integration gap report

Read-only review from The MAP project only, on 2026-11-01. Nothing in CAH, its products, prices, statuses or external accounts was changed.

## What exists today
- **Catalog:** The MAP uses a hand-curated catalog (`supabase/functions/_shared/map-v3/catalog.ts`, last reviewed 2026-11-01). **There is no live sync with CAH.**
- **Links:** CAH `/resources/{id}` pages for listed entries (read-only checks returned 200 for tss, aica, paid-with-ai, powerhorse-academy, cfw, the-offer-fix, faceless-amazon-kdp-blueprint). Two exact owner links: DWA (fanbasis checkout, verification pending) and Monetize What You Know (Skool; the host blocked the automated check with 403, so it's marked pending).
- **Handoff:** With consent, The MAP writes a 2-hour `handoff_sessions` row in this project's backend. CAH reads it via `get_handoff_session` / `consume_handoff_session` using an opaque session ID in the URL. This flow goes MAP → CAH only.
- **Secrets in this project:** `HQ_INGEST_TOKEN`, `LEADCONNECTOR_WEBHOOK_URL`, `LOVABLE_API_KEY`. There are **no** CAH credentials or catalog endpoint configured, and none should be added to the browser.

## What's missing for an approved read-only CAH → MAP catalog
1. **A public, read-only catalog feed owned by CAH** (for example a CAH backend function or a public database view) that returns only MAP-eligible offers. It must need no privileged key. Never use a service-role key in the browser, and never scrape CAH pages as the source of truth.
2. **Per-offer MAP fields in CAH** (CAH-side work, after the current CAH update finishes):
   - `map_eligible` (boolean, owner-controlled) and `map_reviewed_at`
   - product `status` kept separate from the CAH listing state and from link verification
   - canonical destination: a CAH `/resources/{id}` page or an exact owner-approved external/Beacons link
   - `paths` (digital_products, affiliate, quotes, ai_avatar, publishing, social, ai_services, services, asmr, business) and `gaps` (focus, launch, reach, message, conversion, content, routine, systems, expansion, diagnose)
   - `roles` (start, improve, expand, pivot) and stage limits
   - `prerequisites`: devices (windows/mac/chromebook/phone), paid Claude plan, outreach, faceless, existing digital offer, something to sell
   - `price` with source and checked date. Leave it empty when not verified; The MAP will keep showing "Price not confirmed"
   - `free` only when the owner states it
   - `included_in` bundle IDs (for example Prompt to Sales inside Secret Sauce)
   - `owned_aliases` for exact owned-resource matching
3. **An adapter in The MAP** that reads that feed on the server (or at build time), checks it against the same rules (`validateV3Catalog`, `v3Recommendability`), keeps the curated list as a fallback, and records the feed's review date. **Not built yet**, because there's no feed to read.
4. **CAH reading v3 handoff fields:** `primary_stage` now holds a v3 focus ID (for example `message`, `publishing`, `discover`), and `primary_stage_name` holds its label. CAH needs to accept these. This is CAH-side work.
5. **The Decision Point waitlist:** no verified waitlist link exists, so the result mentions it as text only, with no link.

## Owner decisions still needed
- Scope and prerequisites for shortlist items without evidenced scope: Passive by Design, Faceless Launch Formula, AIFluencer Studio, Quote Society, Pin Prompt & Profit, After the Avatar, List to Pinterest, 4 Fig Days, 4 Fig Clients, Post to Profit, 39K Celebration Bundle, Grace & Grit, Stack Method, ColorBot Studio, Low-Ticket Secrets, Daily Sales Rhythm, 100K Threads Challenge, $0 - First Sale Challenge, AI-Podcast Kit 10 Min Workflow, Selling Made Simple, AI to Sales, Molly X Rosie Archive, Vantage System, Monetize It, Prompt to Sales. These are selectable as owned, but never recommended.
- Insta Expand stays pending and is never recommended.
- Whether a Chromebook counts for Paid with AI ("laptop/PC with Chrome"). For now it's treated as not qualifying.
- Device needs for AICA and the Faceless Amazon KDP Blueprint (not documented, so they're not excluded for phone users).
- DWA scope mapping (provisional) and confirmation of the destination page.
- Current verified prices for any item. None are shown until then.
