/**
 * MAP v3 curated catalog adapter. NOT a live sync with the Creator Access
 * Hub (CAH): no supported read-only CAH catalog feed exists for this app, so
 * entries are reviewed by hand. Re-review when CAH offers change and bump
 * V3_CATALOG_LAST_REVIEWED.
 *
 * Conservative rules (owner-approved):
 * - Paid recommendations must be on the owner's paid shortlist AND have
 *   evidenced scope, an active status and a routable, non-retired link.
 * - Shortlist membership alone never makes something recommendable.
 * - Prices: only owner-supplied, publicly corroborated prices are "verified".
 *   Conflicting or missing prices stay "unverified". A capped budget only
 *   accepts free or verified-within-cap items; it never guesses.
 * - Where only a temporary discount was seen, the regular price is used for
 *   budget checks and the discount is not shown.
 * - Device / plan / platform / comfort prerequisites can exclude an entry.
 * - Archived CAH rows or retired URLs never by themselves mean a product is
 *   discontinued (DWA is live; its old CAH page is retired; After the Avatar
 *   only has an obsolete archived link).
 * - No commission-based ranking. Order is editorial and only breaks ties.
 * - Tools are never recommended as a business model (never first unless the
 *   need is tools, systems or content).
 */

import type { Platform } from "./definition.ts";

export const V3_CATALOG_LAST_REVIEWED = "2026-11-01";
export const V3_CATALOG_SYNC_MODE = "curated-manual" as const;
export const CAH_BASE = "https://creatoraccesshub.diamonddigitaldiva.com";
export const cahResource = (id: string) => `${CAH_BASE}/resources/${encodeURIComponent(id)}`;

export type PathId =
  | "digital_products"
  | "affiliate"
  | "quotes"
  | "ai_avatar"
  | "publishing"
  | "social"
  | "ai_services"
  | "services"
  | "asmr"
  | "business";

export type GapId =
  | "focus"
  | "launch"
  | "reach"
  | "message"
  | "conversion"
  | "content"
  | "routine"
  | "systems"
  | "expansion"
  | "diagnose";

export type FocusRole = "start" | "improve" | "expand" | "pivot";

export type V3Price =
  | { state: "free-owner-stated" }
  | { state: "unverified"; note?: string }
  | { state: "verified"; usd: number; checkedAt: string; source: string; note?: string };

export interface V3Destination {
  kind: "cah-resource" | "owner-provided";
  url: string;
  verification: "verified" | "pending" | "failed";
  checkedAt: string;
  note: string;
}

export interface V3Requirements {
  /** Needs one of these computers. Unknown devices fail (never assume a desktop). */
  platforms?: Platform[];
  /** Needs a paid Claude plan ("willing to consider" passes, shown as a requirement). */
  paidClaude?: boolean;
  /** Built around reaching out to businesses or clients. */
  outreach?: boolean;
  /** Built around direct messages with potential customers. */
  messages?: boolean;
  /** Built around faceless content. */
  faceless?: boolean;
  /** Built around creating with an AI avatar. */
  avatar?: boolean;
  /** Needs an AI avatar already (evidenced by currently working on AI avatars/content). */
  existingAvatar?: boolean;
  /** For existing digital-product sellers only. */
  digitalOffer?: boolean;
  /** Needs a product or offer already (own offer, or digital products with sales). */
  offer?: boolean;
  /** Needs something to sell already (own offer or past sales). */
  somethingToSell?: boolean;
  /** Only for people who haven't made a sale yet. */
  noSalesYet?: boolean;
  /**
   * Social platform fit (from the platforms question).
   * required: must have picked one of these.
   * avoid-mismatch: excluded only when platforms were picked and none match.
   */
  socialPlatforms?: { ids: string[]; mode: "required" | "avoid-mismatch" };
}

export interface V3CatalogEntry {
  id: string;
  name: string;
  /** Evidenced scope only. */
  summary: string;
  kind: "training" | "community" | "workbook" | "framework" | "tool";
  status: "active" | "pending" | "being_updated" | "coming_soon" | "unconfirmed";
  statusSource: "owner-confirmed" | "owner-listed" | "cah-active-read" | "cah-flag" | "unconfirmed";
  /** Where the scope summary comes from. */
  scopeSource?: "owner-supplied-research" | "cah-listing" | "owner";
  /** On the owner's paid shortlist (eligibility allow-list for paid items). */
  shortlist: boolean;
  price: V3Price;
  destination: V3Destination | null;
  retiredUrls?: string[];
  /** false = scope not established; never auto-recommended. */
  matchable: boolean;
  scopeNote?: string;
  fits: { paths: PathId[]; gaps: GapId[]; discover?: boolean; roles?: FocusRole[] };
  requires?: V3Requirements;
  requirementNote?: string;
  /** Owned-resource IDs that mean the person already has this. */
  ownedVia: string[];
  /** Owned bundles that include this item; never recommend it standalone then. */
  includedIn?: string[];
  /**
   * true only when the outbound link itself is an evidenced affiliate link
   * (owner-provided affiliate URL). Never inferred; own/free links stay unset.
   */
  affiliate?: true;
}

export const MWYK_URL = "https://www.skool.com/she-knows-more-than-she-thinks-8347/about";
export const DWA_URL =
  "https://www.fanbasis.com/agency-checkout/digitalwealthacademy/rkq5k?affiliate=DiamondDigitalDiva";

/** CAH listings that must never be routed to (mirrors v2 RETIRED_URLS; a test checks this). */
export const V3_RETIRED_URLS: ReadonlySet<string> = new Set(
  ["ata", "mpv", "tacm", "story-algorithm", "foc", "create-launch-sell", "dwa"].map(cahResource)
);

/** Exact owner-provided external links that may be routed to. */
export const V3_OWNER_LINKS: ReadonlySet<string> = new Set([DWA_URL, MWYK_URL]);

/** CAH resource page. Only marked verified because it was actually checked. */
const cah = (id: string): V3Destination => ({
  kind: "cah-resource",
  url: cahResource(id),
  verification: "verified",
  checkedAt: "2026-11-01",
  note: "Read-only check on 2026-11-01: CAH resource page returned 200 (unknown IDs return 404).",
});

const RESEARCH = "Owner-supplied research, 2026-11-01";
const priced = (usd: number, source: string, note?: string): V3Price => ({
  state: "verified",
  usd,
  checkedAt: "2026-11-01",
  source: `${RESEARCH}: ${source}`,
  ...(note ? { note } : {}),
});
const CAH_ACTIVE = { status: "active" as const, statusSource: "cah-active-read" as const, scopeSource: "owner-supplied-research" as const };

const NOT_MATCHED = { paths: [] as PathId[], gaps: [] as GapId[] };
const ALL_ROLES: FocusRole[] = ["start", "improve", "expand", "pivot"];

export const V3_CATALOG: V3CatalogEntry[] = [
  {
    id: "monetize-what-you-know",
    name: "Monetize What You Know",
    summary: "A free community for exploring how to build offers around what you already know.",
    kind: "community",
    status: "active",
    statusSource: "owner-confirmed",
    shortlist: false,
    price: { state: "free-owner-stated" },
    destination: {
      kind: "owner-provided",
      url: MWYK_URL,
      verification: "pending",
      checkedAt: "2026-11-01",
      note: "Owner-provided link. Automated check was blocked by the host (HTTP 403); owner verification pending.",
    },
    matchable: true,
    fits: { paths: [], gaps: ["focus", "diagnose", "expansion"], discover: true },
    ownedVia: [],
  },
  {
    id: "dwa",
    name: "Digital Wealth Academy 4.0",
    summary:
      "Broad digital marketing training covering your own digital products and affiliate marketing. Self-paced, with a community and lifetime access.",
    kind: "training",
    status: "active",
    statusSource: "owner-confirmed",
    scopeSource: "owner-supplied-research",
    shortlist: true,
    price: priced(497, "price matches public corroboration", "Independent syllabus detail not verified."),
    destination: {
      kind: "owner-provided",
      url: DWA_URL,
      verification: "verified",
      checkedAt: "2026-11-01",
      note: "Owner confirmed this is the correct current link (owner confirmation, not an automated check).",
    },
    retiredUrls: [cahResource("dwa")],
    // Owner-provided link carries the owner's affiliate ID.
    affiliate: true,
    matchable: true,
    fits: { paths: ["digital_products", "affiliate"], gaps: [], roles: ["start", "pivot", "expand"] },
    ownedVia: ["res_dwa"],
  },
  {
    id: "cfw",
    name: "Create Faceless Wealth",
    summary:
      "Beginner, phone-friendly training covering faceless business paths: digital products, affiliate marketing and quote pages.",
    kind: "training",
    status: "active",
    statusSource: "owner-listed",
    scopeSource: "owner-supplied-research",
    shortlist: true,
    price: priced(487, "regular price", "A lower discounted price was seen; discounts aren't relied on."),
    destination: cah("cfw"),
    matchable: true,
    fits: { paths: ["digital_products", "affiliate", "quotes"], gaps: [], roles: ["start", "pivot", "expand"] },
    requires: { faceless: true },
    ownedVia: ["res_cfw"],
  },
  {
    id: "aica",
    name: "AI Creator Academy® 2.0",
    summary: "Training on creating realistic AI avatars or digital twins, photos and videos, with brand content strategy.",
    kind: "training",
    status: "active",
    statusSource: "owner-listed",
    scopeSource: "owner-supplied-research",
    shortlist: true,
    price: priced(247, "regular price", "A temporary discounted price was seen; discounts aren't relied on."),
    destination: cah("aica"),
    matchable: true,
    scopeNote: "Device requirements not documented.",
    fits: { paths: ["ai_avatar"], gaps: [], roles: ["start", "pivot", "expand"] },
    requires: { avatar: true },
    ownedVia: ["res_aica"],
  },
  {
    id: "aifluencer-studio",
    name: "AIFluencer Studio",
    summary:
      "Beginner-friendly, self-paced program for realistic AI influencers or digital twins: photos, videos, product shots, animated and talking videos, and consistent visual branding.",
    kind: "training",
    ...CAH_ACTIVE,
    shortlist: true,
    price: priced(97, "public Stan seller listing (no URL supplied)"),
    destination: cah("aifluencer-studio"),
    matchable: true,
    fits: { paths: ["ai_avatar"], gaps: ["content"], roles: ALL_ROLES },
    requires: { avatar: true },
    ownedVia: ["res_aifluencer_studio"],
  },
  {
    id: "ai-to-sales",
    name: "AI to Sales",
    summary:
      "Training on using an AI avatar's storytelling, content and brand personality in your sales content. Not an avatar-creation course.",
    kind: "training",
    ...CAH_ACTIVE,
    shortlist: true,
    price: priced(37, "public Stan bundle listing", "Module format not documented."),
    destination: cah("ai-to-sales"),
    matchable: true,
    fits: { paths: ["ai_avatar"], gaps: ["conversion", "message", "content"], roles: ["improve", "expand"] },
    requires: { existingAvatar: true },
    requirementNote: "For people who already have an AI avatar.",
    ownedVia: ["res_ai_to_sales"],
  },
  {
    id: "faceless-launch",
    name: "Faceless Launch Formula",
    summary: "Training on messaging, positioning and planning a launch for a digital product, organised as a 30-day plan.",
    kind: "training",
    ...CAH_ACTIVE,
    shortlist: true,
    price: priced(77, "public seller listing"),
    destination: cah("faceless-launch"),
    matchable: true,
    fits: { paths: ["digital_products"], gaps: ["launch", "message"], roles: ["improve", "start"] },
    requires: { offer: true },
    requirementNote: "For people who already have a product or offer to launch.",
    ownedVia: ["res_faceless_launch_formula"],
  },
  {
    id: "0-first-sale-challenge",
    name: "$0 - First Sale Challenge",
    summary: "A beginner, step-by-step challenge on the steps toward a first online sale. The name is the product title, not a price or a promised result.",
    kind: "training",
    ...CAH_ACTIVE,
    shortlist: true,
    price: priced(15, "public listings"),
    destination: cah("0-first-sale-challenge"),
    matchable: true,
    fits: { paths: ["digital_products", "affiliate"], gaps: ["launch", "conversion"], roles: ["start", "pivot", "improve"] },
    requires: { noSalesYet: true },
    requirementNote: "For people who haven't made a sale yet.",
    ownedVia: ["res_first_sale_challenge"],
  },
  {
    id: "selling-made-simple",
    name: "Selling Made Simple",
    summary: "A guide to content, DM and posting strategies for low-ticket digital sales, for beginners or existing sellers.",
    kind: "training",
    ...CAH_ACTIVE,
    shortlist: true,
    price: priced(37, "dedicated Beacons listing"),
    destination: cah("selling-made-simple"),
    matchable: true,
    fits: { paths: ["digital_products", "affiliate"], gaps: ["message", "conversion"], roles: ALL_ROLES },
    requires: { messages: true },
    ownedVia: ["res_selling_made_simple"],
  },
  {
    id: "daily-sales-rhythm",
    name: "Daily Sales Rhythm",
    summary:
      "Video and written lessons plus a low-ticket guide for a sustainable sales routine around real life, with activities for 15 minutes, an hour or several hours.",
    kind: "training",
    ...CAH_ACTIVE,
    shortlist: true,
    price: priced(27, "dedicated Beacons listing"),
    destination: cah("daily-sales-rhythm"),
    matchable: true,
    fits: { paths: ["digital_products", "affiliate", "business"], gaps: ["routine"], roles: ALL_ROLES },
    ownedVia: ["res_daily_sales_rhythm"],
  },
  {
    id: "100k-threads-challenge",
    name: "100K Threads Challenge",
    summary: "A 5-day Threads content-consistency challenge with 150+ post ideas and a community. \"100K\" is part of the product title, not a promised result.",
    kind: "training",
    ...CAH_ACTIVE,
    shortlist: true,
    price: priced(27, "dedicated Beacons listing"),
    destination: cah("100k-threads-challenge"),
    matchable: true,
    fits: { paths: ["social"], gaps: ["reach", "content"], roles: ALL_ROLES },
    requires: { socialPlatforms: { ids: ["plat_threads"], mode: "required" } },
    requirementNote: "For Threads.",
    ownedVia: ["res_100k_threads"],
  },
  {
    id: "tss",
    name: "The Secret Sauce",
    summary: "Training on trust-building and soft selling through Instagram Stories, including how to handle buyer objections.",
    kind: "training",
    status: "active",
    statusSource: "owner-listed",
    scopeSource: "owner-supplied-research",
    shortlist: true,
    price: { state: "unverified" },
    destination: cah("tss"),
    matchable: true,
    scopeNote: "May include Prompt to Sales; bundle contents and any promotion not verified here.",
    fits: { paths: ["digital_products", "business", "quotes", "ai_avatar", "affiliate"], gaps: ["conversion", "message"], roles: ["improve"] },
    requires: { somethingToSell: true, socialPlatforms: { ids: ["plat_instagram"], mode: "avoid-mismatch" } },
    requirementNote: "Built around Instagram Stories.",
    ownedVia: ["res_secret_sauce"],
  },
  {
    id: "paid-with-ai",
    name: "Paid with AI",
    summary: "Training on using AI to offer services, with a client outreach route. It doesn't require a social media audience.",
    kind: "training",
    status: "active",
    statusSource: "owner-listed",
    shortlist: true,
    price: { state: "unverified" },
    destination: cah("paid-with-ai"),
    matchable: true,
    fits: { paths: ["ai_services", "services"], gaps: [] },
    requires: { platforms: ["windows", "mac"], paidClaude: true, outreach: true },
    requirementNote: "Needs a laptop or PC with Chrome and a paid Claude Pro plan.",
    ownedVia: ["res_paid_with_ai"],
  },
  {
    id: "powerhorse-academy",
    name: "The Powerhorse Academy™",
    summary: "Training in emotional marketing and AI for business.",
    kind: "training",
    status: "active",
    statusSource: "owner-listed",
    shortlist: true,
    price: { state: "unverified" },
    destination: cah("powerhorse-academy"),
    matchable: true,
    fits: { paths: ["business", "digital_products"], gaps: ["message", "conversion"], roles: ["improve", "expand"] },
    requires: { platforms: ["windows", "mac"], somethingToSell: true },
    requirementNote: "Its Claude Cowork workflow needs a supported Mac or Windows computer.",
    ownedVia: ["res_powerhorse"],
  },
  {
    id: "faceless-amazon-kdp-blueprint",
    name: "Faceless Amazon KDP Blueprint",
    summary: "A beginner walkthrough for publishing with Canva and AI.",
    kind: "training",
    status: "active",
    statusSource: "owner-listed",
    shortlist: true,
    price: { state: "unverified" },
    destination: cah("faceless-amazon-kdp-blueprint"),
    matchable: true,
    scopeNote: "Device requirements not documented.",
    fits: { paths: ["publishing"], gaps: [], roles: ["start", "pivot", "expand"] },
    ownedVia: ["res_kdp_blueprint"],
  },
  {
    id: "ai-podcast-kit-10-min-workflow-x-chatbots-x-100-viral-quot",
    name: "AI-Podcast Kit 10 Min Workflow",
    summary:
      "A kit for making short faceless AI podcast-style videos: image-prompt chatbots, a workflow, 100 quotes and Telegram support. \"10 Min\" is part of the product title.",
    kind: "tool",
    ...CAH_ACTIVE,
    shortlist: true,
    price: priced(29, "public listings"),
    destination: cah("ai-podcast-kit-10-min-workflow-x-chatbots-x-100-viral-quot"),
    matchable: true,
    fits: { paths: ["ai_avatar"], gaps: ["content", "systems"], roles: ["improve", "expand"] },
    requires: { faceless: true },
    ownedVia: ["res_ai_podcast_kit"],
  },
  {
    id: "the-molly-x-rosie-archive",
    name: "Molly X Rosie Archive",
    summary: "An aesthetic, realistic AI prompt bank for visual content. A tool, not a business model.",
    kind: "tool",
    ...CAH_ACTIVE,
    shortlist: true,
    price: priced(25, "public listings"),
    destination: cah("the-molly-x-rosie-archive"),
    matchable: true,
    fits: { paths: ["ai_avatar"], gaps: ["content", "systems"], roles: ALL_ROLES },
    ownedVia: ["res_molly_rosie_archive"],
  },
  {
    id: "prompt-to-sales",
    name: "Prompt to Sales",
    summary: "A realistic AI avatar and content prompt library (1,500+ prompts per the seller). Not sales training.",
    kind: "tool",
    ...CAH_ACTIVE,
    shortlist: true,
    price: { state: "unverified", note: "Public $37 conflicts with $27 in the backend; unresolved." },
    destination: cah("prompt-to-sales"),
    matchable: true,
    fits: { paths: ["ai_avatar"], gaps: ["content", "systems"], roles: ALL_ROLES },
    ownedVia: ["res_prompt_to_sales"],
    includedIn: ["res_secret_sauce"],
  },

  // --- Known scope, but not routable yet (missing or retired destination) ---
  {
    id: "passive-by-design",
    name: "Passive by Design",
    summary:
      "Claude skills plus a classroom of 11 courses and 200+ lessons for tutorials, content systems, digital products and affiliate workflows.",
    kind: "training",
    status: "active",
    statusSource: "owner-listed",
    scopeSource: "owner-supplied-research",
    shortlist: true,
    price: priced(297, "baseline price the owner says is current"),
    destination: null,
    matchable: true,
    scopeNote: "No CAH row in the 2026-11-01 read; not routable until a destination exists.",
    fits: { paths: ["digital_products", "affiliate"], gaps: ["systems"], roles: ALL_ROLES },
    requires: { paidClaude: true },
    requirementNote: "Needs a paid Claude plan.",
    ownedVia: ["res_passive_by_design"],
  },
  {
    id: "pin-prompt-profit",
    name: "Pin Prompt & Profit",
    summary:
      "Beginner training on using Pinterest and AI to share affiliate links, digital products, lists or communities through search. 14 modules, 60 lessons and PinnyBot; doesn't require an existing following.",
    kind: "training",
    status: "active",
    statusSource: "owner-listed",
    scopeSource: "owner-supplied-research",
    shortlist: true,
    price: { state: "unverified", note: "$47 vs $87 unresolved." },
    destination: null,
    matchable: true,
    scopeNote: "No CAH row in the 2026-11-01 read; not routable until a destination exists.",
    fits: { paths: ["affiliate", "digital_products", "social"], gaps: ["reach"], roles: ALL_ROLES },
    ownedVia: ["res_pin_prompt_profit"],
  },
  {
    id: "ata",
    name: "After the Avatar",
    summary: "Training on building a content strategy around an existing AI avatar.",
    kind: "training",
    status: "active",
    statusSource: "owner-listed",
    scopeSource: "owner-supplied-research",
    shortlist: true,
    price: priced(117, "public listing match"),
    destination: null,
    retiredUrls: [cahResource("ata")],
    matchable: true,
    scopeNote: "CAH 'ata' row only has an obsolete archived link. Not discontinued; not routable until a current destination exists.",
    fits: { paths: ["ai_avatar"], gaps: ["content", "conversion"], roles: ["improve", "expand"] },
    requires: { existingAvatar: true },
    ownedVia: ["res_after_the_avatar"],
  },
  {
    id: "quote-society",
    name: "Quote Society",
    summary: "Training on growing and monetizing a quote page (format not confirmed).",
    kind: "training",
    status: "pending",
    statusSource: "owner-listed",
    scopeSource: "owner-supplied-research",
    shortlist: true,
    price: { state: "unverified" },
    destination: null,
    matchable: false,
    scopeNote: "Pending in CAH, no link. Excluded.",
    fits: NOT_MATCHED,
    ownedVia: ["res_quote_society"],
  },
  {
    id: "the-offer-fix",
    name: "The Offer Fix™",
    summary: "",
    kind: "workbook",
    status: "active",
    statusSource: "owner-listed",
    shortlist: true,
    price: { state: "unverified" },
    destination: cah("the-offer-fix"),
    matchable: false,
    scopeNote: "The official description is the title only. Scope not established until the owner confirms it.",
    fits: NOT_MATCHED,
    ownedVia: ["res_offer_fix"],
  },
  {
    id: "insta-expand",
    name: "Insta Expand",
    summary: "",
    kind: "training",
    status: "pending",
    statusSource: "owner-listed",
    shortlist: true,
    price: { state: "unverified" },
    destination: null,
    matchable: false,
    scopeNote: "Owner: pending. Must not be recommended.",
    fits: NOT_MATCHED,
    ownedVia: ["res_insta_expand"],
  },
  {
    id: "the-decision-point",
    name: "The Decision Point",
    summary: "",
    kind: "training",
    status: "being_updated",
    statusSource: "cah-flag",
    shortlist: false,
    price: { state: "unverified" },
    destination: null,
    matchable: false,
    scopeNote: "Waitlist only until The MAP is finished. No verified waitlist link yet.",
    fits: NOT_MATCHED,
    ownedVia: [],
  },
];

export type V3NotRecommendable =
  | "status-not-active"
  | "scope-not-established"
  | "no-destination"
  | "destination-retired"
  | "link-failed"
  | "external-link-not-approved"
  | "not-on-shortlist";

const isHttps = (u: string) => {
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
};

/** Answer-independent eligibility. */
export function v3Recommendability(
  e: V3CatalogEntry
): { ok: true; reason?: undefined } | { ok: false; reason: V3NotRecommendable } {
  if (e.status !== "active") return { ok: false, reason: "status-not-active" };
  const d = e.destination;
  if (!d || !isHttps(d.url)) return { ok: false, reason: "no-destination" };
  if (V3_RETIRED_URLS.has(d.url) || (e.retiredUrls ?? []).includes(d.url)) return { ok: false, reason: "destination-retired" };
  if (d.verification === "failed") return { ok: false, reason: "link-failed" };
  if (d.kind === "cah-resource" && d.url !== cahResource(e.id)) return { ok: false, reason: "no-destination" };
  if (d.kind === "owner-provided" && !V3_OWNER_LINKS.has(d.url)) return { ok: false, reason: "external-link-not-approved" };
  if (!e.shortlist && e.price.state !== "free-owner-stated") return { ok: false, reason: "not-on-shortlist" };
  if (!e.matchable) return { ok: false, reason: "scope-not-established" };
  return { ok: true };
}

const ENTRY_ID = /^[a-z0-9-]{1,60}$/;

/** Drops malformed or duplicate entries. Never throws. */
export function validateV3Catalog(entries: unknown): V3CatalogEntry[] {
  if (!Array.isArray(entries)) throw new Error("catalog is not a list");
  const seen = new Set<string>();
  const out: V3CatalogEntry[] = [];
  for (const raw of entries) {
    const e = raw as Partial<V3CatalogEntry> | null;
    if (!e || typeof e !== "object" || typeof e.id !== "string" || !ENTRY_ID.test(e.id) || seen.has(e.id)) continue;
    if (typeof e.name !== "string" || !e.fits || !Array.isArray(e.fits.paths) || !Array.isArray(e.fits.gaps) || !Array.isArray(e.ownedVia) || !e.price) continue;
    seen.add(e.id);
    out.push(e as V3CatalogEntry);
  }
  return out;
}

/** Canonical not-recommendable IDs; a supplied catalog can't re-enable them. */
export const V3_BLOCKED_IDS: ReadonlySet<string> = new Set(
  V3_CATALOG.filter((e) => !v3Recommendability(e).ok).map((e) => e.id)
);

export const CREATOR_PATH_BY_PATH: Partial<Record<PathId, { slug: string; label: string }>> = {
  digital_products: { slug: "digital-income", label: "Digital Income" },
  quotes: { slug: "quotes", label: "Quote Creators" },
  publishing: { slug: "books-publishing", label: "Books & Publishing" },
  asmr: { slug: "asmr", label: "ASMR Creators" },
  ai_avatar: { slug: "ai-avatar", label: "AI & Avatar Creation" },
  business: { slug: "brand-business", label: "Brand & Business Growth" },
};
