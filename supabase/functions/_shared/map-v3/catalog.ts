/**
 * MAP v3 catalog rules. Paid recommendations come ONLY from the Creator Access
 * Hub's public read-only feed (contract cah-map-catalog/v1, see feed.ts), read
 * the same way in the browser and in send-webhook. There is no hardcoded
 * product list here any more: if the feed is unavailable or invalid, no paid
 * product is suggested (the result keeps its free action plan and a plain
 * CAH browse link).
 *
 * Conservative rules (owner-approved):
 * - A feed product is eligible only when it is on the MAP allowlist below
 *   (owner's reviewed shortlist), CAH marks it MAP-ready (it is in the feed)
 *   and MAP-preferred, it is active/available (never sold out, coming soon or
 *   being updated), it has an evidenced summary, recognised fits and
 *   prerequisites, and a routable, non-retired link. New feed products are
 *   never eligible automatically.
 * - Prices: only feed prices marked verified, in USD, one-time, count as
 *   verified. Anything else is "unverified". A capped budget only accepts free
 *   or verified-within-cap items; it never guesses.
 * - Device / plan / platform / comfort prerequisites can exclude an entry.
 * - Archived CAH rows or retired URLs never by themselves mean a product is
 *   discontinued; they are just never routed to.
 * - No commission-based ranking. Allowlist order is editorial and only breaks ties.
 * - Tools are never recommended as a business model (never first unless the
 *   need is tools, systems or content).
 */

import type { Platform } from "./definition.ts";

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

export const PATH_IDS: readonly PathId[] = [
  "digital_products",
  "affiliate",
  "quotes",
  "ai_avatar",
  "publishing",
  "social",
  "ai_services",
  "services",
  "asmr",
  "business",
];
export const GAP_IDS: readonly GapId[] = [
  "focus",
  "launch",
  "reach",
  "message",
  "conversion",
  "content",
  "routine",
  "systems",
  "expansion",
  "diagnose",
];
export const ROLE_IDS: readonly FocusRole[] = ["start", "improve", "expand", "pivot"];

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
  statusSource: "owner-confirmed" | "owner-listed" | "cah-feed" | "unconfirmed";
  /** Where the scope summary comes from. */
  scopeSource?: "cah-feed" | "owner";
  /** On the owner's shortlist (eligibility allow-list for paid items). */
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
  /** true only when the source marks the product as an affiliate product. Never inferred. */
  affiliate?: true;
  /** CAH owner review time (feed entries only). */
  reviewedAt?: string;
  /** Open questions CAH reports for this product (feed entries only). */
  uncertainties?: string[];
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

/**
 * MAP-local entries (not CAH products). Monetize What You Know is the owner's
 * free community, used when someone is unsure. It is not a purchase link.
 */
export const V3_LOCAL_ENTRIES: V3CatalogEntry[] = [
  {
    id: "monetize-what-you-know",
    name: "Monetize What You Know",
    summary: "A free community for exploring how to build offers around what you already know.",
    kind: "community",
    status: "active",
    statusSource: "owner-confirmed",
    scopeSource: "owner",
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
];

/**
 * MAP allowlist: the CAH product IDs the owner reviewed for The MAP. Order is
 * editorial (ties only, never commission). `kind` is MAP's own classification
 * so tools are never presented as a business model. A product missing here is
 * never recommended, even if CAH adds it to the feed.
 */
export const V3_MAP_ALLOWLIST: readonly { id: string; kind: V3CatalogEntry["kind"] }[] = [
  { id: "dwa", kind: "training" },
  { id: "cfw", kind: "training" },
  { id: "aica", kind: "training" },
  { id: "aifluencer-studio", kind: "training" },
  { id: "ai-to-sales", kind: "training" },
  { id: "faceless-launch", kind: "training" },
  { id: "0-first-sale-challenge", kind: "training" },
  { id: "selling-made-simple", kind: "training" },
  { id: "daily-sales-rhythm", kind: "training" },
  { id: "100k-threads-challenge", kind: "training" },
  { id: "tss", kind: "training" },
  { id: "paid-with-ai", kind: "training" },
  { id: "powerhorse-academy", kind: "training" },
  { id: "faceless-amazon-kdp-blueprint", kind: "training" },
  { id: "ai-podcast-kit-10-min-workflow-x-chatbots-x-100-viral-quot", kind: "tool" },
  { id: "the-molly-x-rosie-archive", kind: "tool" },
  { id: "prompt-to-sales", kind: "tool" },
];

/**
 * Never recommended from The MAP, whatever the feed says (checked before the
 * allowlist). 4 Fig Days is sold out; it is a different product from
 * 4-Figure Clients. Ownership answers for both stay recognised.
 */
export const V3_MAP_BLOCKED: Readonly<Record<string, string>> = {
  "4-fig-days": "sold-out",
  "4-figure-days": "sold-out",
  "four-fig-days": "sold-out",
  "the-offer-fix": "scope-not-established",
  "quote-society": "pending",
  "insta-expand": "pending",
  "the-decision-point": "waitlist-only",
};

export type V3NotRecommendable =
  | "status-not-active"
  | "scope-not-established"
  | "no-destination"
  | "destination-retired"
  | "link-failed"
  | "external-link-not-approved"
  | "not-on-shortlist"
  | "blocked";

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
  if (Object.prototype.hasOwnProperty.call(V3_MAP_BLOCKED, e.id)) return { ok: false, reason: "blocked" };
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

const ENTRY_ID = /^[a-z0-9][a-z0-9-]{0,99}$/;

/** Drops malformed or duplicate entries. Throws only when it isn't a list. */
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

export const CREATOR_PATH_BY_PATH: Partial<Record<PathId, { slug: string; label: string }>> = {
  digital_products: { slug: "digital-income", label: "Digital Income" },
  quotes: { slug: "quotes", label: "Quote Creators" },
  publishing: { slug: "books-publishing", label: "Books & Publishing" },
  asmr: { slug: "asmr", label: "ASMR Creators" },
  ai_avatar: { slug: "ai-avatar", label: "AI & Avatar Creation" },
  business: { slug: "brand-business", label: "Brand & Business Growth" },
};
