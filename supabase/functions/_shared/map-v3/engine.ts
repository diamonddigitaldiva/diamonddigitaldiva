/**
 * MAP v3 deterministic result engine. Same answers always give the same
 * result (key order and option order don't matter). Shared by the app and
 * the send-webhook function, which re-derives results server-side.
 *
 * Model
 * - Beginners (not started) get a STARTING POINT: the best-fitting path from
 *   the possibilities they chose. Several interests are allowed.
 * - Started creators get an IMPROVEMENT gap (from their named obstacle and
 *   what's working) and/or an EXPANSION path, or a PIVOT path.
 * - One primary focus plus at most one alternate.
 *
 * Path score = 3 (chosen) + 2 (already working on it) + up to 2 (assets they
 *   bring that fit) + comfort/preference adjustments (see PATH_ADJUST).
 * Ties: higher score, then fixed editorial PATH_ORDER (never commission).
 *   A tie for first is reported as uncertain, never hidden.
 * Gap: taken from the named obstacle. "Not sure" infers one from what's
 *   working (too early -> launch; little response -> reach; attention but no
 *   sales -> conversion; sales without routine -> routine; else diagnose).
 * Free text is stored but never interpreted.
 */

import {
  MAP_V3_VERSION,
  OWNED_RESOURCES,
  effectivePlatforms,
  getV3Question,
  isStarted,
  validateV3,
  type V3Answers,
} from "./definition.ts";
import {
  CAH_BASE,
  CREATOR_PATH_BY_PATH,
  V3_BLOCKED_IDS,
  V3_CATALOG,
  v3Recommendability,
  validateV3Catalog,
  type FocusRole,
  type GapId,
  type PathId,
  type V3CatalogEntry,
} from "./catalog.ts";

export interface V3CreatorPath {
  slug: string;
  label: string;
  url: string;
}

export interface V3Focus {
  kind: "path" | "gap" | "discover";
  id: string;
  label: string;
  role: FocusRole;
  reasons: string[];
  nextStep: string;
  plan: string[];
  creatorPath: V3CreatorPath | null;
}

export interface V3Resource {
  id: string;
  name: string;
  summary: string;
  kind: V3CatalogEntry["kind"];
  url: string;
  destinationLabel: string;
  priceNote: string;
  requirementNote: string | null;
  forFocus: "primary" | "alternate";
}

export type V3Spend = "free_only" | "capped" | "over_300" | "unsure";

export interface V3Result {
  version: typeof MAP_V3_VERSION;
  answers: V3Answers;
  started: boolean;
  tracks: FocusRole[];
  primary: V3Focus;
  alternate: V3Focus | null;
  uncertain: boolean;
  notes: string[];
  considerations: string[];
  planHorizon: string;
  spend: V3Spend;
  resources: V3Resource[];
  resourcesNote: string;
  ownedFits: string[];
  browse: { label: string; url: string };
  decisionPoint: string | null;
  userNoteAcknowledgement: string | null;
  excluded: { id: string; reason: string }[];
  catalogFallback: boolean;
}

export type V3Build =
  | { ok: true; result: V3Result; missing?: undefined; invalid?: undefined }
  | { ok: false; missing: string[]; invalid: string[]; result?: undefined };

export const MAX_V3_RESOURCES = 2;

/** Editorial tie order for paths. Not based on commission. */
export const PATH_ORDER: PathId[] = [
  "business",
  "digital_products",
  "services",
  "publishing",
  "ai_services",
  "affiliate",
  "quotes",
  "social",
  "ai_avatar",
  "asmr",
];

export const PATH_LABELS: Record<PathId, string> = {
  digital_products: "Creating and selling digital products",
  affiliate: "Recommending products as an affiliate",
  quotes: "A quote or theme page",
  ai_avatar: "AI avatars, images and video",
  publishing: "Books, coloring books and printables",
  social: "Growing on social platforms",
  ai_services: "AI services and systems for businesses",
  services: "Services for clients or businesses",
  asmr: "ASMR and visual entertainment",
  business: "Growing your existing business or brand",
};

export const GAP_LABELS: Record<GapId, string> = {
  focus: "Choosing one focus",
  launch: "Finishing and launching",
  reach: "Reaching the right people",
  message: "Explaining your offer's value",
  conversion: "Turning attention into sales",
  content: "Consistent, recognizable content",
  routine: "A routine you can maintain",
  systems: "Setting up tools and systems",
  expansion: "Choosing an added income stream",
  diagnose: "Finding what's really in the way",
};

export const DISCOVER_LABEL = "Finding what fits you";

const PATH_BY_INTEREST: Record<string, PathId> = {
  int_digital_products: "digital_products",
  int_affiliate: "affiliate",
  int_quotes: "quotes",
  int_ai_avatar: "ai_avatar",
  int_publishing: "publishing",
  int_social: "social",
  int_ai_services: "ai_services",
  int_services: "services",
  int_asmr: "asmr",
  int_business: "business",
};

const PATH_BY_WORK: Record<string, PathId> = {
  work_products: "digital_products",
  work_affiliate: "affiliate",
  work_quotes: "quotes",
  work_ai: "ai_avatar",
  work_books: "publishing",
  work_services: "services",
  work_business: "business",
};

const GAP_BY_OBSTACLE: Record<string, GapId | null> = {
  obst_choose: "focus",
  obst_launch: "launch",
  obst_reach: "reach",
  obst_explain: "message",
  obst_convert: "conversion",
  obst_content: "content",
  obst_routine: "routine",
  obst_systems: "systems",
  obst_add_stream: "expansion",
  obst_unsure: null,
};

const PATH_PHRASE: Record<PathId, string> = {
  digital_products: "creating and selling digital products",
  affiliate: "recommending products as an affiliate",
  quotes: "a quote or theme page",
  ai_avatar: "AI avatars, images or videos",
  publishing: "books, coloring books or printables",
  social: "growing on social platforms",
  ai_services: "using AI to serve businesses",
  services: "offering services to clients or businesses",
  asmr: "ASMR or visual entertainment",
  business: "growing the business or brand you already have",
};

/** Assets (q4) that genuinely help a path. An audience is never treated as an offer. */
const ASSET_FIT: Record<PathId, string[]> = {
  digital_products: ["bring_knowledge", "bring_skill"],
  affiliate: ["bring_content"],
  quotes: ["bring_content"],
  ai_avatar: ["bring_skill"],
  publishing: ["bring_skill", "bring_knowledge"],
  social: ["bring_content"],
  ai_services: ["bring_clients", "bring_knowledge"],
  services: ["bring_clients", "bring_knowledge"],
  asmr: ["bring_skill"],
  business: ["bring_offer", "bring_clients", "bring_content"],
};

const BRING_PHRASE: Record<string, string> = {
  bring_knowledge: "knowledge or experience to share",
  bring_skill: "a creative skill or hobby",
  bring_clients: "experience helping customers or clients",
  bring_content: "content, a page or an audience",
  bring_offer: "an existing offer",
};

const PATH_STEP: Record<PathId, string> = {
  digital_products:
    "Write down three questions people already ask you, pick the one you could answer best, and outline a one-page guide or template that answers it.",
  affiliate:
    "Choose one product you already use and would honestly recommend, check that it has an affiliate program, and write a short, honest note about what it helped you do.",
  quotes:
    "Pick one theme you could post about every day, write ten quotes or lines for it, and set up one page dedicated to that theme.",
  ai_avatar:
    "Choose one simple use for an AI image, avatar or video, such as a short explainer, and create one sample you would be happy to show someone.",
  publishing:
    "Choose one simple format, such as a coloring book, journal or printable, and sketch the outline and who it is for before opening any software.",
  social:
    "Pick one platform and one topic, then post three pieces this week in the same style so people can start to recognize you.",
  ai_services:
    "List three repetitive tasks a small business might pay to have done faster, and pick one you could demonstrate with AI.",
  services:
    "Write one sentence describing a service you could deliver now, who it is for and the result, then share it with three people who might need it or know someone who does.",
  asmr:
    "Choose one sound or visual style you enjoy making, record one short sample, and note what you would need to make it consistently.",
  business:
    "Write down where your current customers come from and what they buy most, then choose one way to reach more of the same people this week.",
};

const PATH_PLAN: Record<PathId, string[]> = {
  digital_products: ["Pick one problem and one person you want to help.", "Make a small, simple first version and show it to a few people.", "Use their questions to improve it before adding more products."],
  affiliate: ["Choose one or two products you genuinely use.", "Share honest, useful content about what they helped you do.", "Track which pieces get clicks and make more of those."],
  quotes: ["Settle on one theme and a consistent visual style.", "Post on a steady schedule you can keep.", "Watch which posts get saved or shared and build around them."],
  ai_avatar: ["Choose one use for AI visuals that solves a real need.", "Create a few samples in one consistent style.", "Share them and ask what people would use them for."],
  publishing: ["Choose one format and one audience.", "Create a small first version and check the details carefully.", "Publish it, then learn from the response before making the next one."],
  social: ["Pick one platform and one topic.", "Post consistently in a recognizable style.", "Every two weeks, review what gets engagement and do more of it."],
  ai_services: ["Pick one task for one type of business.", "Build a simple demonstration of how AI helps with it.", "Offer it to a few businesses and learn what they would pay for."],
  services: ["Define one service, who it is for and the result.", "Tell people you already know and ask for introductions.", "Deliver it well for your first clients and ask for feedback."],
  asmr: ["Choose one style and a simple setup.", "Publish a few samples on a schedule you can keep.", "Notice which pieces people return to and make more like them."],
  business: ["Find where your best customers come from.", "Put more effort into that one channel.", "Ask recent customers what almost stopped them and use their words."],
};

const GAP_STEP: Record<GapId, string> = {
  focus: "List every idea you're juggling, cross off anything you couldn't start this week, and choose one to focus on for the next 30 days.",
  launch: "Write down the smallest version you could release, set a date within two weeks, and list only the tasks needed to get there.",
  reach: "Describe the exact person you want to reach and list three places they already spend time. Show up in one of them this week.",
  message: "Rewrite your offer in one sentence: who it is for, the problem it solves and the result. Ask three people to repeat it back to you.",
  conversion: "Invite a few people who already engage or ask questions directly to your next step, and ask anyone who says no what stopped them.",
  content: "Choose three content themes and one consistent look, and plan your next week of content using only those.",
  routine: "Pick two fixed time blocks each week that you can actually protect, and decide in advance what you'll do in each one.",
  systems: "Find the task that takes you the most time each week and turn it into a simple checklist or template before adding any new tool.",
  expansion: "List two income ideas that reuse what you already have, and choose the one that needs the least new setup to test.",
  diagnose: "For one week, write down what you work on and what response you get. Look for the step where people stop responding.",
};

const GAP_PLAN: Record<GapId, string[]> = {
  focus: ["Choose one focus and write down why it fits your time and what you have.", "Pause the other ideas on purpose, without deleting them.", "Review after 30 days: keep going, or switch once, on purpose."],
  launch: ["Define the smallest version that is useful.", "Set a release date and work only on what it needs.", "Release it, then improve it from real feedback."],
  reach: ["Describe one specific person you want to reach.", "Show up consistently where they already are.", "Track which places bring the most responses and focus there."],
  message: ["Describe your buyer, their problem and the result in plain words.", "Test the wording with real people.", "Use the version they repeat back to you everywhere."],
  conversion: ["Make one clear next step for interested people.", "Invite people who already engage, directly and personally.", "Ask what stops people and fix the biggest objection."],
  content: ["Choose a small set of themes and one look.", "Batch create a week of content in that style.", "Keep what people respond to and drop the rest."],
  routine: ["Choose a weekly schedule you can keep even in a busy week.", "Protect those blocks for the work that matters most.", "Review weekly and adjust the plan, not the commitment."],
  systems: ["Write down the steps of your most repeated task.", "Turn it into a template, checklist or batch session.", "Add a tool only if it clearly saves time on that task."],
  expansion: ["List what you already have that a new stream could reuse.", "Pick one idea and test it in a small way.", "Keep it only if it fits your time without hurting what works."],
  diagnose: ["Track your work and the response for one week.", "Find the step where people stop responding.", "Spend the next two weeks fixing that one step."],
};

const DISCOVER_STEP =
  "Write down three things people ask you for help with and two topics you enjoy. Choose one you could test this week with what you already have.";
const DISCOVER_PLAN = [
  "Write down what people ask you for and what you enjoy.",
  "Try one small, free test of the idea that pulls you most.",
  "Review what you learned and choose your next test on purpose.",
];

const HORIZON: Record<string, string> = {
  time3_lt3: "Over about 4 weeks, at a lighter pace",
  time3_3_5: "Over the next 3 weeks",
  time3_6_10: "Over the next 2 weeks",
  time3_10p: "Over the next 1 to 2 weeks",
  time3_flex: "At your own pace, one step at a time",
};

const BUDGET: Record<string, { spend: V3Spend; max: number }> = {
  budget_free: { spend: "free_only", max: 0 },
  budget_50: { spend: "capped", max: 50 },
  budget_100: { spend: "capped", max: 100 },
  budget_200: { spend: "capped", max: 200 },
  budget_300: { spend: "capped", max: 300 },
  budget_300p: { spend: "over_300", max: Number.POSITIVE_INFINITY },
  budget_unsure: { spend: "unsure", max: Number.POSITIVE_INFINITY },
};

export const DECISION_POINT_NOTE =
  "The Decision Point, a deeper tool for choosing between options, is on a waitlist while we finish it. You don't need it to act on this result.";

// ---------------------------------------------------------------------------

const list = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const phrase = (qid: string, oid: string) => {
  const label = getV3Question(qid)?.options.find((o) => o.id === oid)?.label ?? oid;
  return lowerFirst(label.replace(/\.$/, ""));
};
const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

interface Ctx {
  a: V3Answers;
  started: boolean;
  where: string;
  interestPaths: PathId[];
  workPaths: Set<PathId>;
  bring: string[];
  works: string[];
  help: string[];
  comfort: Record<string, string>;
  madeSales: boolean;
  hasOwnOffer: boolean;
  hasDigitalOffer: boolean;
  attention: boolean;
  noSocial: boolean;
  discover: boolean;
  owned: Set<string>;
  customOwnedUnmatched: boolean;
  support: string[];
  budget: { spend: V3Spend; max: number };
}

function buildCtx(a: V3Answers): Ctx {
  const ints = list(a.m3_interests);
  const works = list(a.m3_working);
  const where = String(a.m3_where);
  const madeSales = where === "where_inconsistent" || where === "where_consistent" || works.includes("works_sales");
  const bring = list(a.m3_bring);
  const workIds = list(a.m3_working_on);

  // Ownership: structured IDs, plus EXACT name matches from typed text only.
  const owned = new Set(list(a.m3_owned).filter((x) => x.startsWith("res_")));
  let customOwnedUnmatched = false;
  const custom = typeof a.m3_owned_other === "string" ? a.m3_owned_other : "";
  for (const part of custom.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean)) {
    const n = normName(part);
    const hit = OWNED_RESOURCES.find((r) => [r.name, ...(r.aliases ?? [])].some((x) => normName(x) === n));
    if (hit) owned.add(hit.id);
    else customOwnedUnmatched = true;
  }

  return {
    a,
    started: isStarted(a),
    where,
    interestPaths: ints.map((i) => PATH_BY_INTEREST[i]).filter((x): x is PathId => !!x),
    workPaths: new Set(workIds.map((w) => PATH_BY_WORK[w]).filter((x): x is PathId => !!x)),
    bring,
    works,
    help: list(a.m3_help),
    comfort: (a.m3_comfort as Record<string, string>) ?? {},
    madeSales,
    hasOwnOffer: bring.includes("bring_offer"),
    hasDigitalOffer: workIds.includes("work_products") && (bring.includes("bring_offer") || madeSales),
    attention: works.some((w) => w === "works_engage" || w === "works_interest" || w === "works_clicks"),
    noSocial: ints.includes("int_no_social"),
    discover: ints.includes("int_discover"),
    owned,
    customOwnedUnmatched,
    support: list(a.m3_support),
    budget: BUDGET[String(a.m3_budget)] ?? BUDGET.budget_unsure,
  };
}

const avoids = (c: Ctx, row: string) => c.comfort[row] === "cmf_avoid";
const welcomes = (c: Ctx, row: string) => c.comfort[row] === "cmf_comfortable" || c.comfort[row] === "cmf_open";

interface ScoredPath {
  path: PathId;
  score: number;
  reasons: string[];
}

/** Documented comfort/preference adjustments per path. */
function pathAdjust(c: Ctx, p: PathId): { delta: number; reason?: string } {
  const allContentAvoided = ["cw_camera", "cw_voice", "cw_avatar", "cw_faceless"].every((r) => avoids(c, r));
  switch (p) {
    case "social":
      return allContentAvoided ? { delta: -3 } : { delta: 0 };
    case "quotes":
      if (avoids(c, "cw_faceless")) return { delta: -2 };
      return welcomes(c, "cw_faceless") ? { delta: 1, reason: "It works without showing your face or using your voice." } : { delta: 0 };
    case "ai_avatar":
      if (avoids(c, "cw_avatar")) return { delta: -2 };
      return welcomes(c, "cw_avatar") ? { delta: 1, reason: "You're comfortable or open to creating with an AI avatar." } : { delta: 0 };
    case "asmr":
      return avoids(c, "cw_voice") && avoids(c, "cw_faceless") ? { delta: -2 } : { delta: 0 };
    case "services":
    case "ai_services": {
      if (avoids(c, "cw_outreach") && avoids(c, "cw_messages")) return { delta: -3 };
      if (avoids(c, "cw_outreach")) return { delta: -1 };
      const bonus = c.comfort.cw_outreach === "cmf_comfortable" ? 1 : 0;
      const ns = c.noSocial ? 1 : 0;
      return {
        delta: bonus + ns,
        reason: bonus ? "You're comfortable reaching out to businesses or clients." : ns ? "It doesn't depend on social media." : undefined,
      };
    }
    case "publishing":
      return c.noSocial ? { delta: 1, reason: "It doesn't depend on social media." } : { delta: 0 };
    default:
      return { delta: 0 };
  }
}

export function scorePaths(c: Ctx): ScoredPath[] {
  const out: ScoredPath[] = [];
  for (const p of new Set(c.interestPaths)) {
    let score = 3;
    const reasons = [`You're interested in ${PATH_PHRASE[p]}.`];
    if (c.workPaths.has(p)) {
      score += 2;
      reasons.push("You're already working on this.");
    }
    const assets = ASSET_FIT[p].filter((b) => c.bring.includes(b)).slice(0, 2);
    for (const b of assets) {
      score += 1;
      reasons.push(`You already bring ${BRING_PHRASE[b]}.`);
    }
    const adj = pathAdjust(c, p);
    score += adj.delta;
    if (adj.reason) reasons.push(adj.reason);
    out.push({ path: p, score, reasons });
  }
  return out.sort((x, y) => y.score - x.score || PATH_ORDER.indexOf(x.path) - PATH_ORDER.indexOf(y.path));
}

function creatorPathFor(p: PathId | null): V3CreatorPath | null {
  const cp = p ? CREATOR_PATH_BY_PATH[p] : undefined;
  return cp ? { ...cp, url: `${CAH_BASE}/creator-paths/${cp.slug}` } : null;
}

function pathFocus(c: Ctx, s: ScoredPath, role: FocusRole): V3Focus {
  let step = PATH_STEP[s.path];
  if (s.path === "social" && avoids(c, "cw_camera")) step += " Choose a format that doesn't need you on camera.";
  if (role === "expand") step = `Keep what already works running. Then ${lowerFirst(step)}`;
  if (role === "pivot") step = `Write down what from your past work still fits. Then ${lowerFirst(step)}`;
  return {
    kind: "path",
    id: s.path,
    label: PATH_LABELS[s.path],
    role,
    reasons: s.reasons.slice(0, 4),
    nextStep: step,
    plan: PATH_PLAN[s.path],
    creatorPath: creatorPathFor(s.path),
  };
}

function gapFocus(c: Ctx, id: GapId, role: FocusRole, reasons: string[]): V3Focus {
  const only = c.workPaths.size === 1 ? [...c.workPaths][0] : null;
  return {
    kind: "gap",
    id,
    label: GAP_LABELS[id],
    role,
    reasons: reasons.slice(0, 4),
    nextStep: GAP_STEP[id],
    plan: GAP_PLAN[id],
    creatorPath: creatorPathFor(only),
  };
}

function discoverFocus(c: Ctx, role: FocusRole): V3Focus {
  const reasons: string[] = [];
  if (c.discover) reasons.push("You asked for help discovering what fits you.");
  if (c.interestPaths.length === 0) reasons.push("You haven't picked a possibility yet, and that's fine.");
  if (c.bring.includes("bring_unsure")) reasons.push("You're not sure yet how your experience could translate.");
  if (role === "pivot") reasons.push("You want a different direction from what you've done so far.");
  return { kind: "discover", id: "discover", label: DISCOVER_LABEL, role, reasons, nextStep: DISCOVER_STEP, plan: DISCOVER_PLAN, creatorPath: null };
}

/** The improvement gap for started creators, with an optional secondary gap. */
function gapFor(c: Ctx, notes: string[]): { id: GapId; reasons: string[]; secondary: GapId | null } {
  const obst = String(c.a.m3_obstacle ?? "");
  let id = GAP_BY_OBSTACLE[obst] ?? null;
  const reasons: string[] = [];
  let secondary: GapId | null = null;
  if (id) {
    reasons.push(`You named "${phrase("m3_obstacle", obst)}" as your biggest obstacle.`);
  } else {
    if (c.works.includes("works_early")) {
      id = "launch";
      reasons.push("You're not sure what the problem is and it's too early to tell, so getting something finished and out comes first.");
    } else if (c.works.includes("works_little")) {
      id = "reach";
      reasons.push("You're putting in effort but seeing little response.");
    } else if (c.attention && !c.madeSales) {
      id = "conversion";
      reasons.push("People already engage or show interest, but it isn't turning into sales yet.");
    } else if (c.madeSales && !c.works.includes("works_routine")) {
      id = "routine";
      reasons.push("You've made sales, but don't have a routine you can maintain yet.");
    } else {
      id = "diagnose";
      reasons.push("Nothing in your answers points to one clear problem yet.");
    }
  }
  if (id === "conversion" && c.attention) reasons.push("People already engage or show interest.");
  if (id === "conversion" && !c.attention) {
    secondary = "reach";
    notes.push(
      "You named turning attention into sales, but haven't marked engagement or interest as working yet. Reaching the right people may need attention too, so it's included as an alternate."
    );
  }
  if (c.madeSales) reasons.push("You've already made sales, so this builds on real evidence.");
  if (c.works.includes("works_little") && id !== "reach" && !secondary) secondary = "reach";
  return { id, reasons, secondary: secondary === id ? null : secondary };
}

// ---------------------------------------------------------------------------
// Resource matching
// ---------------------------------------------------------------------------

type Exclusion =
  | "already-owned"
  | "included-in-owned"
  | "needs-computer"
  | "device-unknown"
  | "needs-paid-claude"
  | "outreach-avoided"
  | "faceless-avoided"
  | "no-digital-offer"
  | "nothing-to-sell"
  | "free-only"
  | "over-budget";

function checkEntry(c: Ctx, e: V3CatalogEntry): { ok: true; claudeConsider: boolean } | { ok: false; reason: Exclusion } {
  if (e.ownedVia.some((id) => c.owned.has(id))) return { ok: false, reason: "already-owned" };
  if ((e.includedIn ?? []).some((id) => c.owned.has(id))) return { ok: false, reason: "included-in-owned" };
  const r = e.requires ?? {};
  if (r.platforms) {
    const p = effectivePlatforms(c.a);
    if (!p) return { ok: false, reason: "device-unknown" };
    if (!r.platforms.some((x) => p.has(x))) return { ok: false, reason: "needs-computer" };
  }
  let claudeConsider = false;
  if (r.paidClaude) {
    const cl = c.a.m3_claude;
    if (cl === "claude_consider") claudeConsider = true;
    else if (cl !== "claude_yes") return { ok: false, reason: "needs-paid-claude" };
  }
  if (r.outreach && avoids(c, "cw_outreach")) return { ok: false, reason: "outreach-avoided" };
  if (r.faceless && avoids(c, "cw_faceless")) return { ok: false, reason: "faceless-avoided" };
  if (r.digitalOffer && !c.hasDigitalOffer) return { ok: false, reason: "no-digital-offer" };
  if (r.somethingToSell && !(c.hasOwnOffer || c.madeSales)) return { ok: false, reason: "nothing-to-sell" };
  if (c.budget.spend === "free_only" && e.price.state !== "free-owner-stated") return { ok: false, reason: "free-only" };
  if (e.price.state === "verified" && e.price.usd > c.budget.max) return { ok: false, reason: "over-budget" };
  return { ok: true, claudeConsider };
}

function fitsFocus(c: Ctx, e: V3CatalogEntry, f: V3Focus): boolean {
  if (e.fits.roles && f.kind !== "discover" && !e.fits.roles.includes(f.role)) return false;
  if (f.kind === "discover") return !!e.fits.discover;
  if (f.kind === "path") return e.fits.paths.includes(f.id as PathId);
  if (!e.fits.gaps.includes(f.id as GapId)) return false;
  if (e.fits.paths.length === 0) return true;
  const mine = new Set<PathId>([...c.workPaths, ...c.interestPaths]);
  return e.fits.paths.some((p) => mine.has(p));
}

function toResource(e: V3CatalogEntry, forFocus: "primary" | "alternate", claudeConsider: boolean): V3Resource {
  const d = e.destination!;
  const priceNote =
    e.price.state === "free-owner-stated"
      ? "Free community (owner-listed)."
      : e.price.state === "verified"
        ? `Listed at $${e.price.usd} when checked on ${e.price.checkedAt}.`
        : "Price not confirmed here. Check the current price before deciding.";
  let requirementNote = e.requirementNote ?? null;
  if (claudeConsider) requirementNote = `${requirementNote ?? ""} You said you'd consider a paid Claude plan, so check that cost first.`.trim();
  return {
    id: e.id,
    name: e.name,
    summary: e.summary,
    kind: e.kind,
    url: d.url,
    destinationLabel:
      d.kind === "cah-resource" ? "Creator Access Hub page" : e.kind === "community" ? "Free community on Skool" : "External checkout page",
    priceNote,
    requirementNote,
    forFocus,
  };
}

// ---------------------------------------------------------------------------

export function buildResultV3(input: unknown, catalog: unknown = V3_CATALOG): V3Build {
  const v = validateV3(input);
  if (!v.ok || !v.answers) return { ok: false, missing: v.missing ?? [], invalid: v.invalid ?? [] };
  const a = v.answers;
  const c = buildCtx(a);
  const notes: string[] = [];
  const considerations: string[] = [];

  const ranked = scorePaths(c);
  let primary: V3Focus;
  let alternate: V3Focus | null = null;
  let tracks: FocusRole[];
  let uncertain = false;

  const tieNote = (x: ScoredPath, y: ScoredPath) =>
    notes.push(
      `Your answers fit "${PATH_LABELS[x.path]}" and "${PATH_LABELS[y.path]}" equally. "${PATH_LABELS[x.path]}" is listed first only because of a fixed tie order, so treat both as reasonable places to start.`
    );

  if (!c.started) {
    tracks = ["start"];
    const [top, second] = ranked;
    if (!top) primary = discoverFocus(c, "start");
    else {
      primary = pathFocus(c, top, "start");
      if (second && second.score >= top.score - 2) alternate = pathFocus(c, second, "start");
      if (second && second.score === top.score) {
        uncertain = true;
        tieNote(top, second);
      }
    }
  } else if (c.where === "where_redirect") {
    tracks = ["pivot"];
    const fresh = ranked.filter((p) => !c.workPaths.has(p.path));
    const [top, second] = fresh;
    if (!top) primary = discoverFocus(c, "pivot");
    else {
      primary = pathFocus(c, top, "pivot");
      if (second && second.score === top.score) {
        uncertain = true;
        tieNote(top, second);
      }
    }
    if (top && second && second.score >= top.score - 2) alternate = pathFocus(c, second, "pivot");
    else {
      const g = gapFor(c, notes);
      if (!["focus", "expansion", "diagnose"].includes(g.id)) alternate = gapFocus(c, g.id, "improve", g.reasons);
    }
  } else {
    const g = gapFor(c, notes);
    const wantsExpand = c.help.includes("help_add_stream") || c.help.includes("help_new_direction") || g.id === "expansion";
    const wantsImprove = ["help_improve", "help_blocker", "help_activate"].some((h) => c.help.includes(h));
    const fresh = ranked.filter((p) => !c.workPaths.has(p.path));
    const expansion = fresh[0] ? pathFocus(c, fresh[0], "expand") : null;
    if (expansion && fresh[1] && fresh[1].score === fresh[0].score && (g.id === "expansion" || !wantsImprove)) {
      uncertain = true;
      tieNote(fresh[0], fresh[1]);
    }

    if (g.id === "expansion") {
      tracks = ["expand"];
      primary = expansion ?? gapFocus(c, "expansion", "expand", g.reasons);
      if (expansion) primary.reasons = [...g.reasons, ...primary.reasons].slice(0, 4);
      if (fresh[1] && fresh[1].score >= fresh[0].score - 2) alternate = pathFocus(c, fresh[1], "expand");
    } else if (wantsExpand && !wantsImprove && expansion) {
      tracks = ["expand", "improve"];
      primary = expansion;
      alternate = gapFocus(c, g.id, "improve", g.reasons);
    } else {
      tracks = wantsExpand ? ["improve", "expand"] : ["improve"];
      primary = gapFocus(c, g.id, "improve", g.reasons);
      if (wantsExpand) alternate = expansion ?? gapFocus(c, "expansion", "expand", ["You'd like to add another income stream."]);
      else if (g.secondary) alternate = gapFocus(c, g.secondary, "improve", ["Your answers point here too."]);
    }
    if (g.id === "diagnose") {
      uncertain = true;
      notes.push("Your answers don't point to one clear problem, so the first step is to find it rather than guess.");
    }
  }

  if (c.discover && primary.kind === "path") {
    uncertain = true;
    notes.push("You asked for help discovering what fits, so treat this as a first thing to test, not a final answer.");
  }
  const others = ranked.length - 1 - (alternate?.kind === "path" ? 1 : 0);
  if (primary.kind === "path" && others > 0) {
    notes.push(`You also chose ${others === 1 ? "one other possibility" : `${others} other possibilities`}. ${others === 1 ? "It" : "They"} can wait until this first one is moving.`);
  }
  if (c.noSocial && c.interestPaths.includes("social")) {
    const plats = list(a.m3_platforms);
    notes.push(
      plats.includes("plat_pinterest") || plats.includes("plat_youtube")
        ? "You're interested in social platforms and also in options that don't rely on social media. Pinterest and YouTube work more like search, so they can fit both."
        : "You're interested in social platforms and also in options that don't rely on social media. Both stay open; your next step shows which to test first."
    );
  }
  if (c.where === "where_consistent" && !c.works.includes("works_sales") && c.started) {
    notes.push("You said your sales are consistent but didn't mark sales as working, so this plan is based on what you marked.");
  }
  if ((c.where === "where_new" || c.where === "where_learning") && c.works.includes("works_sales")) {
    notes.push("You've already made sales or booked clients, so this builds on that rather than starting over.");
  }

  const t = String(a.m3_time);
  if (t === "time3_lt3") considerations.push("With under 3 hours a week, keep each step small and do one thing at a time.");
  if (t === "time3_flex") considerations.push("Since your availability changes, there's no fixed schedule. Do the next step whenever you have a free block.");

  // ---- Resources ----------------------------------------------------------
  const excluded: { id: string; reason: string }[] = [];
  const ownedFits: string[] = [];
  let resources: V3Resource[] = [];
  let catalogFallback = false;
  try {
    const entries = validateV3Catalog(catalog);
    const focuses: [V3Focus, "primary" | "alternate"][] = [[primary, "primary"]];
    if (alternate) focuses.push([alternate, "alternate"]);
    const pickFor = (f: V3Focus, slot: "primary" | "alternate", taken: Set<string>): V3Resource | null => {
      const cands: { e: V3CatalogEntry; score: number; order: number; consider: boolean }[] = [];
      entries.forEach((e, order) => {
        if (!fitsFocus(c, e, f)) return;
        if (V3_BLOCKED_IDS.has(e.id) || !v3Recommendability(e).ok) {
          excluded.push({ id: e.id, reason: "not-recommendable" });
          return;
        }
        const chk = checkEntry(c, e);
        if (!chk.ok) {
          excluded.push({ id: e.id, reason: chk.reason });
          if (chk.reason === "already-owned" && !ownedFits.includes(e.name)) ownedFits.push(e.name);
          return;
        }
        if (taken.has(e.id)) return;
        const score = 3 + (e.kind === "community" && c.support.includes("sup_community") ? 1 : 0);
        cands.push({ e, score, order, consider: chk.claudeConsider });
      });
      cands.sort((x, y) => y.score - x.score || x.order - y.order);
      // A tool never leads unless the focus is systems.
      const pick = cands.find((x) => x.e.kind !== "tool" || (f.kind === "gap" && f.id === "systems"));
      return pick ? toResource(pick.e, slot, pick.consider) : null;
    };
    const taken = new Set<string>();
    for (const [f, slot] of focuses) {
      const r = pickFor(f, slot, taken);
      if (r) {
        resources.push(r);
        taken.add(r.id);
      }
    }
    // Unsure or asking for community/decision help: the free community is a safe addition.
    const unsureSignals =
      uncertain || primary.kind === "discover" || c.support.some((s) => ["sup_community", "sup_decide", "sup_unsure"].includes(s));
    if (resources.length < MAX_V3_RESOURCES && unsureSignals && !taken.has("monetize-what-you-know")) {
      const mwyk = entries.find((e) => e.id === "monetize-what-you-know");
      if (mwyk && v3Recommendability(mwyk).ok && !V3_BLOCKED_IDS.has(mwyk.id)) {
        const chk = checkEntry(c, mwyk);
        if (chk.ok) resources.push(toResource(mwyk, "alternate", false));
      }
    }
    resources = resources.slice(0, MAX_V3_RESOURCES);
  } catch {
    resources = [];
    catalogFallback = true;
  }

  const reasonsSeen = new Set(excluded.map((x) => x.reason));
  const p = effectivePlatforms(a);
  if (reasonsSeen.has("needs-computer")) {
    considerations.push(
      p?.has("chromebook") && p.size === 1
        ? "Some options need a Mac or Windows computer, so we left those out because you mainly use a Chromebook."
        : p?.has("phone") && p.size === 1
          ? "Some options need a computer, so we left those out because you mainly use a phone or tablet."
          : "Some options need a Mac or Windows computer, so we left those out."
    );
  }
  if (reasonsSeen.has("device-unknown")) considerations.push("Some options need a specific computer, and we didn't assume you have one, so we left those out.");
  if (reasonsSeen.has("needs-paid-claude")) considerations.push("Some AI service options need a paid Claude plan, so we left those out.");
  if (reasonsSeen.has("outreach-avoided")) considerations.push("You'd prefer not to reach out to businesses or clients, so we left out options built around outreach.");
  if (reasonsSeen.has("faceless-avoided")) considerations.push("You'd prefer not to make faceless content, so we left out options built around it.");
  if (ownedFits.length) considerations.push(`You already own ${ownedFits.join(" and ")}, which fits this. Start there before buying anything new.`);
  if (list(a.m3_owned).includes("own_need_help"))
    considerations.push("You'd like help using what you already own. Go through it with the next step above in mind before adding anything new.");
  if (c.customOwnedUnmatched)
    considerations.push("You typed in other resources. We only match exact names, so check that any suggestion isn't something you already own.");

  const hasPaid = resources.some((r) => !r.priceNote.startsWith("Free"));
  let resourcesNote: string;
  if (catalogFallback) resourcesNote = "We couldn't load resource suggestions right now. Your result above doesn't depend on them.";
  else if (c.budget.spend === "free_only")
    resourcesNote = resources.length
      ? "You chose free resources and what you already own, so only free options are shown."
      : "You chose free resources and what you already own, so nothing paid is suggested. Every step above works without buying anything.";
  else if (resources.length === 0)
    resourcesNote = "Nothing in the current catalog is a confirmed fit for these answers, so we're not guessing. You can browse the Creator Access Hub instead.";
  else if (c.budget.spend === "unsure")
    resourcesNote = "Shown for comparison only. You don't need to buy anything to use this result, and prices aren't confirmed here.";
  else if (hasPaid && c.budget.spend === "capped")
    resourcesNote = "Optional. Prices aren't confirmed here, so we can't say whether these fit your range. Check the current price before deciding.";
  else resourcesNote = "Optional. You can take every step above without buying anything.";

  const decisionNeeded =
    primary.kind === "discover" ||
    (primary.kind === "gap" && primary.id === "focus") ||
    c.support.includes("sup_decide") ||
    uncertain;

  const result: V3Result = {
    version: MAP_V3_VERSION,
    answers: a,
    started: c.started,
    tracks,
    primary,
    alternate,
    uncertain,
    notes: Array.from(new Set(notes)),
    considerations,
    planHorizon: HORIZON[t] ?? HORIZON.time3_flex,
    spend: c.budget.spend,
    resources,
    resourcesNote,
    ownedFits,
    browse: { label: "Browse the Creator Access Hub", url: CAH_BASE },
    decisionPoint: decisionNeeded ? DECISION_POINT_NOTE : null,
    userNoteAcknowledgement:
      typeof a.m3_notes === "string"
        ? "We saved your note with your result. The recommendation above comes only from your selected answers, so read it with your note in mind."
        : null,
    excluded,
    catalogFallback,
  };
  return { ok: true, result };
}

/** Compact, versioned snapshot for storage and webhooks. No personal data. */
export function resultSnapshotV3(r: V3Result) {
  const f = (x: V3Focus) => ({ kind: x.kind, id: x.id, label: x.label, role: x.role, nextStep: x.nextStep, plan: x.plan, reasons: x.reasons });
  return {
    version: r.version,
    started: r.started,
    tracks: r.tracks,
    primary: f(r.primary),
    alternate: r.alternate ? f(r.alternate) : null,
    uncertain: r.uncertain,
    notes: r.notes,
    considerations: r.considerations,
    planHorizon: r.planHorizon,
    spend: r.spend,
    resources: r.resources.map((x) => ({ id: x.id, name: x.name, url: x.url })),
    creatorPath: r.primary.creatorPath,
    browseUrl: r.browse.url,
  };
}

/** Legacy CRM fields (names/types unchanged). Never a product as the "stage". */
export function legacyFieldsV3(r: V3Result) {
  return {
    primaryStage: r.primary.label,
    secondaryStage: r.alternate ? r.alternate.label : null,
    primaryStageUrl: r.primary.creatorPath?.url ?? CAH_BASE,
    secondaryStageUrl: null as string | null,
  };
}
