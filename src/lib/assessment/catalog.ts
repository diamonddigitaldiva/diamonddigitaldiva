/**
 * Creator Access Hub (CAH) catalog adapter for The MAP.
 *
 * This is a CURATED mapping, not a live sync. No supported public CAH catalog
 * API exists for this app, so entries were reviewed by hand against CAH
 * resource pages (/resources/{id}). Automatic synchronization is NOT
 * implemented: re-review this file whenever the CAH catalog changes and bump
 * CATALOG_LAST_REVIEWED.
 *
 * Rules:
 * - Only describe scope the CAH catalog supports. No prices, no free/paid claims.
 * - Never rank by commission. Order below is editorial and only breaks ties.
 * - A tool is never recommended as a business model (see matching rules).
 * - Links always point at CAH resource pages. Never add personal data to URLs.
 */

import type { Avenue, Priority, UserStage } from "./types";

export const CAH_BASE_URL = "https://creatoraccesshub.diamonddigitaldiva.com";
export const CATALOG_LAST_REVIEWED = "2026-10-22";
export const CATALOG_SYNC_MODE = "curated-manual" as const;

export type ResourceKind = "training" | "community" | "workbook" | "framework" | "tool";
export type ResourceStatus = "active";

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
  /** Catalog-supported scope only. */
  summary: string;
  kind: ResourceKind;
  status: ResourceStatus;
  /** false = listed for reference but never auto-recommended (scope not established). */
  matchable: boolean;
  avenues: Avenue[];
  stages: UserStage[];
  priorities: Priority[];
  /** Extra eligibility, evidenced from answers. */
  eligible?: (p: MatchProfile) => boolean;
  eligibilityNote?: string;
}

export interface CatalogExclusion {
  id: string;
  name: string;
  reason: "archived" | "eligibility-not-evidenced" | "being-updated" | "coming-soon" | "not-in-current-catalog";
}

const ALL_STAGES: UserStage[] = ["exploring", "starting", "launched", "selling", "pivoting"];
const hasOffer = (p: MatchProfile) => p.hasOffer;

export const CATALOG: CatalogEntry[] = [
  {
    id: "the-offer-fix",
    name: "The Offer Fix™",
    summary:
      "A guided workbook for existing digital-product sellers to clarify buyer, problem, message and the next sales test.",
    kind: "workbook",
    status: "active",
    matchable: true,
    avenues: ["digital_products", "brand_business"],
    stages: ["launched", "selling", "pivoting"],
    priorities: ["clarity", "conversion", "validation"],
    eligible: hasOffer,
    eligibilityNote: "Only when answers show an existing product or offer.",
  },
  {
    id: "faceless-amazon-kdp-blueprint",
    name: "Faceless Amazon KDP Blueprint",
    summary: "A beginner walkthrough for publishing with Canva and AI.",
    kind: "training",
    status: "active",
    matchable: true,
    avenues: ["books_publishing"],
    stages: ["exploring", "starting", "pivoting"],
    priorities: ["direction", "clarity", "validation"],
  },
  {
    id: "the-faceless-girl-academy",
    name: "The Faceless Girl Academy",
    summary: "Training for building a faceless brand around quotes, themes and viral-tea content.",
    kind: "training",
    status: "active",
    matchable: true,
    avenues: ["quotes_faceless"],
    stages: ["exploring", "starting", "launched", "pivoting"],
    priorities: ["direction", "clarity", "growth"],
  },
  {
    id: "quote-cash-club",
    name: "Quote Cash Club",
    summary: "A community focused on growing and monetizing quote pages.",
    kind: "community",
    status: "active",
    matchable: true,
    avenues: ["quotes_faceless"],
    stages: ["starting", "launched", "selling"],
    priorities: ["growth", "conversion", "validation"],
  },
  {
    id: "cfw",
    name: "Create Faceless Wealth",
    summary: "A faceless income masterclass.",
    kind: "training",
    status: "active",
    matchable: true,
    avenues: ["quotes_faceless", "digital_products"],
    stages: ["exploring", "starting", "pivoting"],
    priorities: ["direction", "clarity"],
  },
  {
    id: "aica",
    name: "AI Creator Academy® 2.0",
    summary: "AI creator training.",
    kind: "training",
    status: "active",
    matchable: true,
    avenues: ["ai_avatar"],
    stages: ["exploring", "starting", "launched", "pivoting"],
    priorities: ["direction", "clarity", "systems"],
  },
  {
    id: "paid-with-ai",
    name: "Paid with AI",
    summary: "Training on AI content, websites, funnels, automation and monetization.",
    kind: "training",
    status: "active",
    matchable: true,
    avenues: ["ai_avatar", "digital_products", "tools_workflows"],
    stages: ["starting", "launched", "selling", "pivoting"],
    priorities: ["conversion", "systems", "validation"],
  },
  {
    id: "tss",
    name: "The Secret Sauce",
    summary: "A sales psychology framework.",
    kind: "framework",
    status: "active",
    matchable: true,
    avenues: ["digital_products", "brand_business", "quotes_faceless", "ai_avatar"],
    stages: ["launched", "selling", "pivoting"],
    priorities: ["conversion"],
  },
  {
    id: "powerhorse-academy",
    name: "The Powerhorse Academy™",
    summary: "Training in emotional marketing and AI for business.",
    kind: "training",
    status: "active",
    matchable: true,
    avenues: ["brand_business", "digital_products"],
    stages: ["starting", "launched", "selling", "pivoting"],
    priorities: ["conversion", "growth", "clarity"],
  },
  {
    id: "the-conversion-architect",
    name: "The Conversion Architect",
    summary: "An AI tool for sales-page structure and copy.",
    kind: "tool",
    status: "active",
    matchable: true,
    avenues: ["digital_products", "brand_business"],
    stages: ["launched", "selling", "pivoting"],
    priorities: ["conversion", "systems"],
    eligible: hasOffer,
    eligibilityNote: "Only when answers show an existing offer to write a page for.",
  },
  {
    id: "promptbank",
    name: "PromptBank",
    summary: "A collection of AI prompts.",
    kind: "tool",
    status: "active",
    matchable: true,
    avenues: ["ai_avatar", "tools_workflows", "digital_products", "quotes_faceless"],
    stages: ALL_STAGES,
    priorities: ["systems"],
  },
  {
    id: "openart",
    name: "OpenArt",
    summary: "An AI image tool.",
    kind: "tool",
    status: "active",
    matchable: true,
    avenues: ["ai_avatar", "asmr_visual", "books_publishing"],
    stages: ALL_STAGES,
    priorities: ["systems"],
  },
  {
    id: "showrunner-bot",
    name: "Showrunner™ Bot",
    summary: "A content creation bot.",
    kind: "tool",
    status: "active",
    matchable: true,
    avenues: ["quotes_faceless", "asmr_visual", "ai_avatar", "tools_workflows"],
    stages: ALL_STAGES,
    priorities: ["systems"],
  },
  {
    id: "lovable",
    name: "Lovable",
    summary: "An AI app builder.",
    kind: "tool",
    status: "active",
    matchable: true,
    avenues: ["tools_workflows", "digital_products"],
    stages: ALL_STAGES,
    priorities: ["systems"],
  },
  {
    id: "aifluencer-studio",
    name: "AIfluencer Studio",
    summary: "An AI creator course. Detailed scope not verified.",
    kind: "training",
    status: "active",
    matchable: false,
    avenues: ["ai_avatar"],
    stages: ALL_STAGES,
    priorities: [],
  },
  {
    id: "workflow-hub",
    name: "The Workflow Hub",
    summary: "A CAH resource. Scope not documented here.",
    kind: "tool",
    status: "active",
    matchable: false,
    avenues: [],
    stages: ALL_STAGES,
    priorities: [],
  },
];

/** Never recommended. Checked again at match time as a second guard. */
export const CATALOG_EXCLUSIONS: CatalogExclusion[] = [
  { id: "ata", name: "ATA", reason: "archived" },
  { id: "dwa", name: "DWA", reason: "archived" },
  { id: "mpv", name: "MPV", reason: "archived" },
  { id: "tacm", name: "TACM", reason: "archived" },
  { id: "story-algorithm", name: "Story Algorithm", reason: "archived" },
  { id: "foc", name: "Funnels of Course", reason: "archived" },
  { id: "create-launch-sell", name: "Create Launch Sell", reason: "archived" },
  { id: "cpm", name: "The Pivot Method (CPM)", reason: "eligibility-not-evidenced" },
  { id: "anti-clone-decoder", name: "The Anti-Clone Decoder", reason: "eligibility-not-evidenced" },
  { id: "the-map", name: "The MAP", reason: "being-updated" },
  { id: "the-decision-point", name: "The Decision Point", reason: "being-updated" },
  { id: "studio-velora", name: "Studio Velora", reason: "coming-soon" },
  { id: "after-the-algorithm", name: "After The Algorithm", reason: "not-in-current-catalog" },
  { id: "the-faceless-launch", name: "The Faceless Launch", reason: "not-in-current-catalog" },
  { id: "tsa", name: "TSA", reason: "not-in-current-catalog" },
];

export const EXCLUDED_IDS: ReadonlySet<string> = new Set(CATALOG_EXCLUSIONS.map((e) => e.id));

export function resourceUrl(id: string): string {
  return `${CAH_BASE_URL}/resources/${encodeURIComponent(id)}`;
}

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

/** Drops malformed, inactive or excluded entries. Never throws. */
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
    if (EXCLUDED_IDS.has(e.id)) {
      issues.push(`${e.id}: excluded`);
      continue;
    }
    if (seen.has(e.id)) {
      issues.push(`${e.id}: duplicate`);
      continue;
    }
    if (
      e.status !== "active" ||
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
}

export const MAX_RESOURCES = 2;

/**
 * Deterministic matching. Returns at most two optional resources.
 * - No avenue (unsure) or capacity priority: nothing to buy, focus first.
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
        if (!e.matchable || EXCLUDED_IDS.has(e.id)) return null;
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
        url: resourceUrl(e.id),
      })),
      catalogError: false,
    };
  } catch {
    return { resources: [], catalogError: true };
  }
}
