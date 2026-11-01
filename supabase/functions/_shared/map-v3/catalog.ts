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
 * - Prices are not verified for any entry, so none is shown or treated as
 *   within a budget. Free-only respondents only see owner-stated free items.
 * - Device / plan prerequisites can exclude an entry.
 * - Archived CAH rows or retired URLs never by themselves mean a product is
 *   discontinued (DWA is live; its old CAH page is retired).
 * - No commission-based ranking. Order is editorial and only breaks ties.
 * - Tools are never recommended as a business model.
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
  | { state: "unverified" }
  | { state: "verified"; usd: number; checkedAt: string; source: string };

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
  /** Built around faceless content. */
  faceless?: boolean;
  /** For existing digital-product sellers only. */
  digitalOffer?: boolean;
  /** Needs something to sell already (own offer or past sales). */
  somethingToSell?: boolean;
}

export interface V3CatalogEntry {
  id: string;
  name: string;
  /** Evidenced scope only. */
  summary: string;
  kind: "training" | "community" | "workbook" | "framework" | "tool";
  status: "active" | "pending" | "being_updated" | "coming_soon" | "unconfirmed";
  statusSource: "owner-confirmed" | "owner-listed" | "cah-flag" | "unconfirmed";
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

const cah = (id: string): V3Destination => ({
  kind: "cah-resource",
  url: cahResource(id),
  verification: "verified",
  checkedAt: "2026-11-01",
  note: "Read-only check: CAH resource page returned 200.",
});

const NOT_MATCHED = { paths: [] as PathId[], gaps: [] as GapId[] };

export const V3_CATALOG: V3CatalogEntry[] = [
  {
    id: "monetize-what-you-know",
    name: "Monetize What You Know",
    summary: "A free community for figuring out how to turn what you know into income.",
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
    id: "the-offer-fix",
    name: "The Offer Fix™",
    summary: "A guided workbook for existing digital-product sellers to clarify buyer, problem, message and the next sales test.",
    kind: "workbook",
    status: "active",
    statusSource: "owner-listed",
    shortlist: true,
    price: { state: "unverified" },
    destination: cah("the-offer-fix"),
    matchable: true,
    fits: { paths: ["digital_products"], gaps: ["message", "conversion"], roles: ["improve"] },
    requires: { digitalOffer: true },
    requirementNote: "For people who already have a digital product.",
    ownedVia: ["res_offer_fix"],
  },
  {
    id: "tss",
    name: "The Secret Sauce",
    summary: "A sales psychology framework.",
    kind: "framework",
    status: "active",
    statusSource: "owner-listed",
    shortlist: true,
    price: { state: "unverified" },
    destination: cah("tss"),
    matchable: true,
    scopeNote: "May include Prompt to Sales; bundle contents and any promotion not verified here.",
    fits: { paths: ["digital_products", "business", "quotes", "ai_avatar"], gaps: ["conversion", "message"], roles: ["improve"] },
    requires: { somethingToSell: true },
    ownedVia: ["res_secret_sauce"],
  },
  {
    id: "dwa",
    name: "Digital Wealth Academy 4.0",
    summary: "Review the checkout page for current details before deciding.",
    kind: "training",
    status: "active",
    statusSource: "owner-confirmed",
    shortlist: true,
    price: { state: "unverified" },
    destination: {
      kind: "owner-provided",
      url: DWA_URL,
      verification: "pending",
      checkedAt: "2026-10-22",
      note: "Owner-approved current link. Redirects to a commas.com checkout with the affiliate kept; owner confirmation of the exact page pending.",
    },
    retiredUrls: [cahResource("dwa")],
    matchable: true,
    scopeNote: "Path mapping is provisional pending owner confirmation of scope.",
    fits: { paths: ["digital_products"], gaps: [], roles: ["start", "pivot", "expand"] },
    ownedVia: ["res_dwa"],
  },
  {
    id: "aica",
    name: "AI Creator Academy® 2.0",
    summary: "AI creator training.",
    kind: "training",
    status: "active",
    statusSource: "owner-listed",
    shortlist: true,
    price: { state: "unverified" },
    destination: cah("aica"),
    matchable: true,
    scopeNote: "Device requirements not documented.",
    fits: { paths: ["ai_avatar"], gaps: [], roles: ["start", "pivot", "expand"] },
    ownedVia: ["res_aica"],
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
    id: "cfw",
    name: "Create Faceless Wealth",
    summary: "A faceless income masterclass.",
    kind: "training",
    status: "active",
    statusSource: "owner-listed",
    shortlist: true,
    price: { state: "unverified" },
    destination: cah("cfw"),
    matchable: true,
    fits: { paths: ["quotes", "digital_products"], gaps: [], roles: ["start", "pivot", "expand"] },
    requires: { faceless: true },
    ownedVia: ["res_cfw"],
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

  // --- Known, but not recommendable (scope, status or link not established) ---
  {
    id: "aifluencer-studio",
    name: "AIfluencer Studio",
    summary: "An AI creator course. Detailed scope not verified.",
    kind: "training",
    status: "active",
    statusSource: "owner-listed",
    shortlist: true,
    price: { state: "unverified" },
    destination: cah("aifluencer-studio"),
    matchable: false,
    fits: NOT_MATCHED,
    ownedVia: ["res_aifluencer_studio"],
  },
  {
    id: "passive-by-design",
    name: "Passive by Design",
    summary: "",
    kind: "training",
    status: "unconfirmed",
    statusSource: "unconfirmed",
    shortlist: true,
    price: { state: "unverified" },
    destination: null,
    matchable: false,
    scopeNote: "Scope and destination not established. Requires a paid Claude plan.",
    fits: NOT_MATCHED,
    requires: { paidClaude: true },
    ownedVia: ["res_passive_by_design"],
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
    id: "prompt-to-sales",
    name: "Prompt to Sales",
    summary: "",
    kind: "tool",
    status: "unconfirmed",
    statusSource: "unconfirmed",
    shortlist: true,
    price: { state: "unverified" },
    destination: null,
    matchable: false,
    scopeNote: "May be included in Secret Sauce; never recommend standalone to Secret Sauce owners.",
    fits: NOT_MATCHED,
    ownedVia: ["res_prompt_to_sales"],
    includedIn: ["res_secret_sauce"],
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
