# MAP v3 ↔ Creator Access Hub: integration gap report

Read-only review from The MAP project only (updated 2026-11-01 with owner-supplied research). Nothing in CAH, its products, prices, statuses or external accounts was changed.

## What exists today
- **Catalog:** a hand-curated catalog (`supabase/functions/_shared/map-v3/catalog.ts`, last reviewed 2026-11-01). **There is no live sync with CAH.** Scope summaries come from owner-supplied research (Nov 1); prices count as verified only when the owner supplied a matching, publicly corroborated price.
- **CAH links (read-only HTTP check, 2026-11-01, 200 OK; unknown IDs return 404):** tss, aica, cfw, paid-with-ai, powerhorse-academy, faceless-amazon-kdp-blueprint, the-offer-fix, aifluencer-studio, faceless-launch, daily-sales-rhythm, 100k-threads-challenge, 0-first-sale-challenge, ai-to-sales, selling-made-simple, the-molly-x-rosie-archive, prompt-to-sales, ai-podcast-kit-10-min-workflow-x-chatbots-x-100-viral-quot. The owner's CAH read confirmed the last ten as ACTIVE.
- **Owner links:** DWA (Fanbasis checkout, the owner confirmed it's the correct current link) and Monetize What You Know (Skool; the owner-provided link blocks automated checks).
- **Handoff:** with consent, The MAP calls the validated `create_handoff_session` function, which writes a 2-hour `handoff_sessions` row and returns only its ID (guests have no read access to sessions); CAH reads it through `get_handoff_session` / `consume_handoff_session` using an opaque ID. This flow goes MAP → CAH only.
- **Secrets in this project:** HQ ingest token, CRM webhook URL and the managed AI key. There are **no** CAH credentials or catalog endpoint, and none should be added to the browser.

## Known products that can't be suggested yet
- **Missing destination only (scope known):** Passive by Design (needs a paid Claude plan; $297), Pin Prompt & Profit (price unresolved, $47 vs $87). Neither had a CAH row in the Nov 1 read.
- **After the Avatar:** scope known ($117); the CAH `ata` row only has an obsolete archived link, which stays retired. Not discontinued.
- **Pending:** Quote Society (no link), Insta Expand.
- **Scope not established:** The Offer Fix (the official description is the title only).
- **Not on the catalog:** Vantage System. It isn't confirmed to be the same product as "aria-vantage", so the two aren't treated as one.
- **The Decision Point:** waitlist only, with no verified waitlist link. It's mentioned as text only.
- **Prices still unverified:** Secret Sauce, Paid with AI, Powerhorse Academy, Faceless Amazon KDP Blueprint, Prompt to Sales ($37 public vs $27 in the backend), Pin Prompt & Profit, Quote Society. With a set spending range these are left out; with "unsure" or "more than $300" they show as "Price not confirmed".

## What's missing for a read-only CAH → MAP catalog feed
1. **A public, read-only feed owned by CAH** (for example a CAH backend function or a public database view) that returns only MAP-eligible offers. It must need no privileged key: no service-role key in the browser, and no scraping CAH pages as the source of truth.
2. **Per-offer MAP fields in CAH** (after the current CAH update finishes): `map_eligible`, `map_reviewed_at`; product status kept separate from the listing state and from link verification; a canonical destination (CAH `/resources/{id}` or an exact owner-approved Beacons/external link); `paths`, `gaps`, `roles`; prerequisites (devices, paid Claude, outreach, messages, faceless, avatar comfort, existing avatar, existing offer, no sales yet, social platforms); `price` with source and checked date (empty when not verified, regular price rather than a temporary discount); owner-stated `free`; `included_in` bundles (for example Prompt to Sales inside Secret Sauce); `owned_aliases`.
3. **A MAP adapter** that reads the feed on the server or at build time, applies `validateV3Catalog` and `v3Recommendability`, keeps the curated list as a fallback, and records the feed's review date. **Not built**, because no feed exists yet.
4. **CAH reading v3 handoff fields:** `primary_stage` holds a v3 focus ID (for example `message`, `publishing`, `discover`) and `primary_stage_name` holds its label.
5. **When Passive by Design gets a destination:** the paid-Claude question currently only appears for the AI services and client services interests, so it would also need to appear for digital products and affiliate respondents. Until then, the engine safely leaves it out.

## Unresolved before publish
- **Marketing consent:** the lead form now says only "We use your details to save your MAP result. See Terms and Privacy Policy." No marketing-consent field is sent to the CRM. Whether the CRM's own workflow enrolls MAP leads in marketing email is unverified (the CRM was not inspected or changed), so no live email delivery or opt-in can be claimed. Review the CRM workflow before publishing.
- Chromebook eligibility for Paid with AI ("laptop/PC with Chrome") is treated as not qualifying.
- Device needs for AICA and the Faceless Amazon KDP Blueprint aren't documented, so phone users aren't excluded from them.
