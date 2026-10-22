/**
 * Creator Access Hub (CAH) catalog adapter for The MAP.
 *
 * This is a CURATED mapping, not a live sync. No supported public CAH catalog
 * API exists for this app, so entries were reviewed by hand. Automatic
 * synchronization is NOT implemented: re-review this file whenever offers
 * change and bump CATALOG_LAST_REVIEWED.
 *
 * Product availability and link availability are tracked SEPARATELY:
 * - `product`     is the product itself (owner-confirmed, owner-listed, CAH flag, or unconfirmed).
 * - `cahListing`  is the state of its CAH catalog row. An archived row is NOT
 *                 proof the product is discontinued (rows auto-archive for
 *                 reasons like an unapproved link host).
 * - `destination` is where we would send people, with its own verification state.
 * - `retiredDestinations` are old URLs that must never be routed to, even
 *                 when the product is live.
 *
 * Rules:
 * - Only describe scope the catalog or owner supports. No prices, no free/paid claims.
 * - Never rank by commission. Order below is editorial and only breaks ties.
 * - A tool is never recommended as a business model (see matching rules).
 * - Never add personal data to URLs.
 */

import type { Avenue, Priority, UserStage } from "./types";

export const CAH_BASE_URL = "https://creatoraccesshub.diamonddigitaldiva.com";
export const CATALOG_LAST_REVIEWED = "2026-10-22";
export const CATALOG_SYNC_MODE = "curated-manual" as const;

export type ResourceKind = "training" | "community" | "workbook" | "framework" | "tool";

/** State of the product itself, independent of any link or listing. */
export type ProductStatus = "active" | "being_updated" | "coming_soon" | "unconfirmed";
export type ProductStatusSource = "owner-confirmed" | "owner-listed" | "cah-flag" | "unconfirmed";
/** State of the product's CAH catalog row. */
export type CahListing = "listed" | "archived" | "not-listed" | "unknown";
export type LinkVerificationState = "verified" | "pending" | "failed";

export interface LinkVerification {
  state: LinkVerificationState;
  checkedAt: string;
  note: string;
}

export interface Destination {
  /** cah-resource = CAH /resources/{id}; owner-provided = exact link supplied by the owner. */
  kind: "cah-resource" | "owner-provided";
  url: string;
  verification: LinkVerification;
}

export interface MatchProfile {
  priority: Priority;
  secondaryPriority: Priority | null;
  avenue: Avenue | null;
  stage: UserStage;
  hasOffer: boolean;
  hasSales: boolean;
}

export interface CatalogEntry {
  id: string;
  name: string;
  /** Catalog- or owner-supported scope only. */
  summary: string;
  kind: ResourceKind;
  product: { status: ProductStatus; source: ProductStatusSource; note?: string };
  cahListing: CahListing;
  destination: Destination | null;
  retiredDestinations?: { url: string; reason: string }[];
  /** false = listed for reference but never auto-recommended (scope not established). */
  matchable: boolean;
  /** true = current eligibility for this offer is not evidenced; never recommend. */
  eligibilityNotEvidenced?: boolean;
  /** Owner still needs to confirm how this maps to avenues/priorities. */
  scopeNote?: string;
  avenues: Avenue[];
  stages: UserStage[];
  priorities: Priority[];
  /** Extra eligibility, evidenced from answers. */
  eligible?: (p: MatchProfile) => boolean;
  eligibilityNote?: string;
}

export function resourceUrl(id: string): string {
  return `${CAH_BASE_URL}/resources/${encodeURIComponent(id)}`;
}

const ALL_STAGES: UserStage[] = ["exploring", "starting", "launched", "selling", "pivoting"];
const hasOffer = (p: MatchProfile) => p.hasOffer;

/**
 * Exact external links the owner supplied and approved. External links are
 * only routable when listed here (affiliate parameters are not personal data).
 */
export const DWA_OWNER_LINK =
  "https://www.fanbasis.com/agency-checkout/digitalwealthacademy/rkq5k?affiliate=DiamondDigitalDiva";
export const OWNER_APPROVED_LINKS: ReadonlySet<string> = new Set([DWA_OWNER_LINK]);

const cahVerified = (id: string): Destination => ({
  kind: "cah-resource",
  url: resourceUrl(id),
  verification: { state: "verified", checkedAt: "2026-10-22", note: "CAH resource page returned 200." },
});

type MatchFields = Pick<CatalogEntry, "avenues" | "stages" | "priorities" | "eligible" | "eligibilityNote">;

/** Active product listed on CAH, routed to its CAH resource page. */
function cahListed(
  id: string,
  name: string,
  summary: string,
  kind: ResourceKind,
  match: MatchFields,
  matchable = true
): CatalogEntry {
  return {
    id,
    name,
    summary,
    kind,
    product: { status: "active", source: "owner-listed" },
    cahListing: "listed",
    destination: cahVerified(id),
    matchable,
    ...match,
  };
}

/** Known product with no routable destination, or not recommendable for another reason. */
function notRoutable(
  id: string,
  name: string,
  product: CatalogEntry["product"],
  cahListing: CahListing,
  extra: Partial<CatalogEntry> = {}
): CatalogEntry {
  return {
    id,
    name,
    summary: "",
    kind: "training",
    product,
    cahListing,
    destination: null,
    matchable: false,
    avenues: [],
    stages: [],
    priorities: [],
    ...extra,
  };
}

const LISTING_ARCHIVED_UNCONFIRMED = {
  status: "unconfirmed" as const,
  source: "unconfirmed" as const,
  note: "CAH listing archived. That alone does not prove the product is discontinued; availability not confirmed by the owner.",
};

export const CATALOG: CatalogEntry[] = [
  cahListed(
    "the-offer-fix",
    "The Offer Fix™",
    "A guided workbook for existing digital-product sellers to clarify buyer, problem, message and the next sales test.",
    "workbook",
    {
      avenues: ["digital_products", "brand_business"],
      stages: ["launched", "selling", "pivoting"],
      priorities: ["clarity", "conversion", "validation"],
      eligible: hasOffer,
      eligibilityNote: "Only when answers show an existing product or offer.",
    }
  ),
  cahListed("faceless-amazon-kdp-blueprint", "Faceless Amazon KDP Blueprint", "A beginner walkthrough for publishing with Canva and AI.", "training", {
    avenues: ["books_publishing"],
    stages: ["exploring", "starting", "pivoting"],
    priorities: ["direction", "clarity", "validation"],
  }),
  cahListed(
    "the-faceless-girl-academy",
    "The Faceless Girl Academy",
    "Training for building a faceless brand around quotes, themes and viral-tea content.",
    "training",
    {
      avenues: ["quotes_faceless"],
      stages: ["exploring", "starting", "launched", "pivoting"],
      priorities: ["direction", "clarity", "growth"],
    }
  ),
  cahListed("quote-cash-club", "Quote Cash Club", "A community focused on growing and monetizing quote pages.", "community", {
    avenues: ["quotes_faceless"],
    stages: ["starting", "launched", "selling"],
    priorities: ["growth", "conversion", "validation"],
  }),
  cahListed("cfw", "Create Faceless Wealth", "A faceless income masterclass.", "training", {
    avenues: ["quotes_faceless", "digital_products"],
    stages: ["exploring", "starting", "pivoting"],
    priorities: ["direction", "clarity"],
  }),
  {
    id: "dwa",
    name: "Digital Wealth Academy 4.0",
    summary: "Review the checkout page for current details before deciding.",
    kind: "training",
    product: {
      status: "active",
      source: "owner-confirmed",
      note:
        "Owner confirmed live on 2026-10-22. The CAH row was auto-archived (Oct 1/8) because of an unapproved link host (www.fanbasis.com), not because the product was discontinued.",
    },
    cahListing: "archived",
    destination: {
      kind: "owner-provided",
      url: DWA_OWNER_LINK,
      verification: {
        state: "pending",
        checkedAt: "2026-10-22",
        note:
          "Automated check: redirects to a commas.com checkout with the affiliate kept (HTTP 200). That it is the Commas DWA English 4.0 checkout is not machine-confirmed; owner verification pending.",
      },
    },
    retiredDestinations: [{ url: resourceUrl("dwa"), reason: "CAH listing archived; do not route while archived." }],
    matchable: true,
    scopeNote: "Avenue and priority mapping is provisional pending owner confirmation of scope.",
    avenues: ["digital_products"],
    stages: ["exploring", "starting", "launched", "pivoting"],
    priorities: ["direction", "clarity", "validation"],
  },
  cahListed("aica", "AI Creator Academy® 2.0", "AI creator training.", "training", {
    avenues: ["ai_avatar"],
    stages: ["exploring", "starting", "launched", "pivoting"],
    priorities: ["direction", "clarity", "systems"],
  }),
  cahListed("paid-with-ai", "Paid with AI", "Training on AI content, websites, funnels, automation and monetization.", "training", {
    avenues: ["ai_avatar", "digital_products", "tools_workflows"],
    stages: ["starting", "launched", "selling", "pivoting"],
    priorities: ["conversion", "systems", "validation"],
  }),
  cahListed("tss", "The Secret Sauce", "A sales psychology framework.", "framework", {
    avenues: ["digital_products", "brand_business", "quotes_faceless", "ai_avatar"],
    stages: ["launched", "selling", "pivoting"],
    priorities: ["conversion"],
  }),
  cahListed("powerhorse-academy", "The Powerhorse Academy™", "Training in emotional marketing and AI for business.", "training", {
    avenues: ["brand_business", "digital_products"],
    stages: ["starting", "launched", "selling", "pivoting"],
    priorities: ["conversion", "growth", "clarity"],
  }),
  cahListed("the-conversion-architect", "The Conversion Architect", "An AI tool for sales-page structure and copy.", "tool", {
    avenues: ["digital_products", "brand_business"],
    stages: ["launched", "selling", "pivoting"],
    priorities: ["conversion", "systems"],
    eligible: hasOffer,
    eligibilityNote: "Only when answers show an existing offer to write a page for.",
  }),
  cahListed("promptbank", "PromptBank", "A collection of AI prompts.", "tool", {
    avenues: ["ai_avatar", "tools_workflows", "digital_products", "quotes_faceless"],
    stages: ALL_STAGES,
    priorities: ["systems"],
  }),
  cahListed("openart", "OpenArt", "An AI image tool.", "tool", {
    avenues: ["ai_avatar", "asmr_visual", "books_publishing"],
    stages: ALL_STAGES,
    priorities: ["systems"],
  }),
  cahListed("showrunner-bot", "Showrunner™ Bot", "A content creation bot.", "tool", {
    avenues: ["quotes_faceless", "asmr_visual", "ai_avatar", "tools_workflows"],
    stages: ALL_STAGES,
    priorities: ["systems"],
  }),
  cahListed("lovable", "Lovable", "An AI app builder.", "tool", {
    avenues: ["tools_workflows", "digital_products"],
    stages: ALL_STAGES,
    priorities: ["systems"],
  }),
  cahListed(
    "aifluencer-studio",
    "AIfluencer Studio",
    "An AI creator course. Detailed scope not verified.",
    "training",
    { avenues: ["ai_avatar"], stages: ALL_STAGES, priorities: [] },
    false
  ),
  cahListed(
    "workflow-hub",
    "The Workflow Hub",
    "A CAH resource. Scope not documented here.",
    "tool",
    { avenues: [], stages: ALL_STAGES, priorities: [] },
    false
  ),

  // --- Known products that are not currently routable ----------------------
  notRoutable("ata", "ATA", LISTING_ARCHIVED_UNCONFIRMED, "archived", { retiredDestinations: [{ url: resourceUrl("ata"), reason: "CAH listing archived." }] }),
  notRoutable("mpv", "MPV", LISTING_ARCHIVED_UNCONFIRMED, "archived", { retiredDestinations: [{ url: resourceUrl("mpv"), reason: "CAH listing archived." }] }),
  notRoutable("tacm", "TACM", LISTING_ARCHIVED_UNCONFIRMED, "archived", { retiredDestinations: [{ url: resourceUrl("tacm"), reason: "CAH listing archived." }] }),
  notRoutable("story-algorithm", "Story Algorithm", LISTING_ARCHIVED_UNCONFIRMED, "archived", { retiredDestinations: [{ url: resourceUrl("story-algorithm"), reason: "CAH listing archived." }] }),
  notRoutable("foc", "Funnels of Course", LISTING_ARCHIVED_UNCONFIRMED, "archived", { retiredDestinations: [{ url: resourceUrl("foc"), reason: "CAH listing archived." }] }),
  notRoutable("create-launch-sell", "Create Launch Sell", LISTING_ARCHIVED_UNCONFIRMED, "archived", { retiredDestinations: [{ url: resourceUrl("create-launch-sell"), reason: "CAH listing archived." }] }),
  notRoutable("cpm", "The Pivot Method (CPM)", { status: "unconfirmed", source: "unconfirmed" }, "unknown", {
    eligibilityNotEvidenced: true,
  }),
  notRoutable("anti-clone-decoder", "The Anti-Clone Decoder", { status: "unconfirmed", source: "unconfirmed" }, "unknown", {
    eligibilityNotEvidenced: true,
  }),
  notRoutable("the-map", "The MAP", { status: "being_updated", source: "cah-flag" }, "unknown"),
  notRoutable("the-decision-point", "The Decision Point", { status: "being_updated", source: "cah-flag" }, "unknown"),
  notRoutable("studio-velora", "Studio Velora", { status: "coming_soon", source: "cah-flag" }, "unknown"),
  notRoutable("after-the-algorithm", "After The Algorithm", { status: "unconfirmed", source: "unconfirmed" }, "not-listed"),
  notRoutable("the-faceless-launch", "The Faceless Launch", { status: "unconfirmed", source: "unconfirmed" }, "not-listed"),
  notRoutable("tsa", "TSA", { status: "unconfirmed", source: "unconfirmed" }, "not-listed"),
];

export type NotRecommendableReason =
  | "product-not-active"
  | "eligibility-not-evidenced"
  | "no-destination"
  | "cah-listing-not-listed"
  | "destination-retired"
  | "link-failed"
  | "external-link-not-approved"
  | "scope-not-established";

export const REASON_LABELS: Record<NotRecommendableReason, string> = {
  "product-not-active": "Product not confirmed active",
  "eligibility-not-evidenced": "Current eligibility not evidenced",
  "no-destination": "No routable link",
  "cah-listing-not-listed": "CAH listing not active",
  "destination-retired": "Link is retired",
  "link-failed": "Link failed verification",
  "external-link-not-approved": "External link not owner-approved",
  "scope-not-established": "Scope not established",
};

/** URLs that must never be routed to, collected from the canonical catalog. */
export const RETIRED_URLS: ReadonlySet<string> = new Set(
  CATALOG.flatMap((e) => (e.retiredDestinations ?? []).map((d) => d.url))
);

function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Whether an entry may be recommended at all (before answer matching).
 * Product state and link state are checked independently.
 */
export function recommendability(
  e: CatalogEntry
): { ok: true; reason?: undefined } | { ok: false; reason: NotRecommendableReason } {
  if (e.eligibilityNotEvidenced) return { ok: false, reason: "eligibility-not-evidenced" };
  if (e.product.status !== "active") return { ok: false, reason: "product-not-active" };
  const d = e.destination;
  if (!d || !isHttps(d.url)) return { ok: false, reason: "no-destination" };
  if (RETIRED_URLS.has(d.url) || (e.retiredDestinations ?? []).some((r) => r.url === d.url))
    return { ok: false, reason: "destination-retired" };
  if (d.verification.state === "failed") return { ok: false, reason: "link-failed" };
  if (d.kind === "cah-resource") {
    if (e.cahListing !== "listed") return { ok: false, reason: "cah-listing-not-listed" };
    if (d.url !== resourceUrl(e.id)) return { ok: false, reason: "no-destination" };
  } else if (!OWNER_APPROVED_LINKS.has(d.url) || e.product.source !== "owner-confirmed") {
    return { ok: false, reason: "external-link-not-approved" };
  }
  if (!e.matchable) return { ok: false, reason: "scope-not-established" };
  return { ok: true };
}

/**
 * IDs the canonical catalog says must not be recommended. Used as a second
 * guard so a supplied catalog can't re-enable them by changing flags.
 */
export const NOT_RECOMMENDABLE_IDS: ReadonlySet<string> = new Set(
  CATALOG.filter((e) => {
    const r = recommendability(e);
    return !r.ok && r.reason !== "scope-not-established";
  }).map((e) => e.id)
);

/** Creator paths on CAH. `family` has no matching assessment avenue yet. */
export const CREATOR_PATHS: { slug: string; label: string; avenue: Avenue | null }[] = [
  { slug: "digital-income", label: "Digital Income", avenue: "digital_products" },
  { slug: "quotes", label: "Quote Creators", avenue: "quotes_faceless" },
  { slug: "books-publishing", label: "Books & Publishing", avenue: "books_publishing" },
  { slug: "asmr", label: "ASMR Creators", avenue: "asmr_visual" },
  { slug: "ai-avatar", label: "AI & Avatar Creation", avenue: "ai_avatar" },
  { slug: "brand-business", label: "Brand & Business Growth", avenue: "brand_business" },
  { slug: "creator-tools", label: "Creator Tools", avenue: "tools_workflows" },
  { slug: "family", label: "Family Creators", avenue: null },
];

export interface CreatorPathLink {
  slug: string;
  label: string;
  url: string;
}

export function creatorPathFor(avenue: Avenue | null): CreatorPathLink | null {
  if (!avenue) return null;
  const p = CREATOR_PATHS.find((c) => c.avenue === avenue);
  return p ? { slug: p.slug, label: p.label, url: `${CAH_BASE_URL}/creator-paths/${p.slug}` } : null;
}

const ID_PATTERN = /^[a-z0-9-]{1,60}$/;

/** Drops malformed or duplicate entries. Never throws. */
export function validateCatalog(entries: unknown): { valid: CatalogEntry[]; issues: string[] } {
  const issues: string[] = [];
  if (!Array.isArray(entries)) return { valid: [], issues: ["catalog is not a list"] };
  const seen = new Set<string>();
  const valid: CatalogEntry[] = [];
  for (const raw of entries) {
    const e = raw as Partial<CatalogEntry> | null;
    if (!e || typeof e !== "object" || typeof e.id !== "string" || !ID_PATTERN.test(e.id)) {
      issues.push("entry with invalid id");
      continue;
    }
    if (seen.has(e.id)) {
      issues.push(`${e.id}: duplicate`);
      continue;
    }
    if (
      !e.product ||
      typeof e.product !== "object" ||
      typeof e.name !== "string" ||
      !e.name.trim() ||
      typeof e.summary !== "string" ||
      !Array.isArray(e.avenues) ||
      !Array.isArray(e.stages) ||
      !Array.isArray(e.priorities)
    ) {
      issues.push(`${e.id}: malformed`);
      continue;
    }
    seen.add(e.id);
    valid.push(e as CatalogEntry);
  }
  return { valid, issues };
}

export interface RecommendedResource {
  id: string;
  name: string;
  summary: string;
  kind: ResourceKind;
  url: string;
  /** Where the link goes, shown to the person. */
  destinationLabel: string;
}

export const MAX_RESOURCES = 2;

/**
 * Deterministic matching. Returns at most two optional resources.
 * - No avenue (unsure) or capacity priority: nothing to buy, focus first.
 * - Entry must be recommendable (product active AND routable, non-retired link).
 * - Must match avenue + stage + (primary or secondary priority) + eligibility.
 * - Tools may only lead when the priority is systems; otherwise a tool can
 *   only appear after a non-tool resource.
 */
export function matchResources(
  profile: MatchProfile,
  catalog: unknown = CATALOG
): { resources: RecommendedResource[]; catalogError: boolean } {
  try {
    if (!profile.avenue || profile.priority === "capacity") {
      return { resources: [], catalogError: false };
    }
    const { valid } = validateCatalog(catalog);
    const scored = valid
      .map((e, order) => {
        if (NOT_RECOMMENDABLE_IDS.has(e.id)) return null;
        if (!recommendability(e).ok) return null;
        if (!e.avenues.includes(profile.avenue as Avenue)) return null;
        if (!e.stages.includes(profile.stage)) return null;
        if (e.eligible && !e.eligible(profile)) return null;
        let score = 0;
        if (e.priorities.includes(profile.priority)) score += 3;
        if (profile.secondaryPriority && e.priorities.includes(profile.secondaryPriority)) score += 1;
        if (score === 0) return null;
        return { e, score, order };
      })
      .filter((x): x is { e: CatalogEntry; score: number; order: number } => x !== null)
      .sort((a, b) => b.score - a.score || a.order - b.order);

    const toolsMayLead = profile.priority === "systems";
    const picked: CatalogEntry[] = [];
    const nonTools = scored.filter((s) => s.e.kind !== "tool");
    const tools = scored.filter((s) => s.e.kind === "tool");
    const ordered = toolsMayLead ? scored : [...nonTools, ...tools];
    for (const s of ordered) {
      if (picked.length >= MAX_RESOURCES) break;
      if (s.e.kind === "tool" && !toolsMayLead && picked.length === 0) continue;
      picked.push(s.e);
    }

    return {
      resources: picked.map((e) => ({
        id: e.id,
        name: e.name,
        summary: e.summary,
        kind: e.kind,
        url: e.destination!.url,
        destinationLabel:
          e.destination!.kind === "cah-resource" ? "Creator Access Hub page" : "External checkout page",
      })),
      catalogError: false,
    };
  } catch {
    return { resources: [], catalogError: true };
  }
}
