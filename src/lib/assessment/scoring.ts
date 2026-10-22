import { ASSESSMENT_QUESTIONS, ASSESSMENT_VERSION, QUESTION_IDS } from "./questions";
import { creatorPathFor, matchResources, CATALOG, type CreatorPathLink, type RecommendedResource } from "./catalog";
import type {
  AssessmentAnswers,
  Avenue,
  Priority,
  SpendPreference,
  TimeBand,
  UserStage,
} from "./types";

/**
 * Tie-break order: the more foundational priority wins, because fixing it
 * unblocks the ones after it. Independent of answer order.
 */
export const PRIORITY_ORDER: Priority[] = [
  "direction",
  "clarity",
  "validation",
  "conversion",
  "capacity",
  "systems",
  "growth",
];

export const PRIORITY_LABELS: Record<Priority, string> = {
  direction: "Choosing your direction",
  clarity: "Clarifying who it's for and what you offer",
  validation: "Proving people want it",
  conversion: "Turning interest into sales",
  capacity: "Making room to follow through",
  systems: "Simplifying your workflow",
  growth: "Growing what already works",
};

export const STAGE_LABELS: Record<UserStage, string> = {
  exploring: "Exploring",
  starting: "Starting",
  launched: "Launched",
  selling: "Selling",
  pivoting: "Pivoting",
};

export const AVENUE_LABELS: Record<Avenue, string> = {
  digital_products: "Digital products and services",
  quotes_faceless: "Quote pages and faceless content",
  books_publishing: "Books and publishing",
  asmr_visual: "ASMR and visual content",
  ai_avatar: "AI and avatar creation",
  brand_business: "Brand and business",
  tools_workflows: "Creator tools and workflows",
};

const AVENUE_NOUN: Record<Avenue, string> = {
  digital_products: "digital product or service",
  quotes_faceless: "quote or faceless page",
  books_publishing: "book",
  asmr_visual: "ASMR or visual channel",
  ai_avatar: "AI or avatar content",
  brand_business: "brand",
  tools_workflows: "tool or workflow offer",
};

type Weights = Partial<Record<Priority, number>>;

/** Points each option adds per priority. Options not listed add nothing. */
export const OPTION_WEIGHTS: Record<string, Weights> = {
  stage_exploring: { direction: 3 },
  stage_starting: { clarity: 1, validation: 1 },
  stage_launched: { conversion: 2, clarity: 1 },
  stage_selling: { growth: 2, systems: 1 },
  stage_pivoting: { direction: 2, clarity: 1 },
  avenue_unsure: { direction: 3 },
  goal_choose: { direction: 2 },
  goal_first_offer: { clarity: 1, validation: 1 },
  goal_first_sale: { validation: 1, conversion: 1 },
  goal_consistent: { conversion: 2 },
  goal_audience: { growth: 1, clarity: 1 },
  goal_time: { systems: 2 },
  clarity_none: { clarity: 3 },
  clarity_audience: { clarity: 2 },
  clarity_offer: { conversion: 2, clarity: 1 },
  evidence_none: { validation: 2 },
  evidence_engagement: { validation: 1, conversion: 1 },
  evidence_requests: { conversion: 1 },
  evidence_sales: { growth: 1 },
  time_lt3: { capacity: 2 },
  time_3_7: { capacity: 1 },
  owned_courses: { capacity: 1 },
  owned_audience: { conversion: 1 },
  owned_product: { conversion: 1 },
};

/** Plain-language reason shown when an option contributed to the priority. */
const OPTION_REASONS: Record<string, string> = {
  stage_exploring: "You're still exploring and haven't picked a direction.",
  stage_starting: "You've picked a direction, but nothing is live yet.",
  stage_launched: "Something is live, but sales are uneven or haven't started.",
  stage_selling: "You already make regular sales.",
  stage_pivoting: "What you built no longer fits, so direction comes before more output.",
  avenue_unsure: "You're not sure which avenue fits yet.",
  goal_choose: "Your 90-day goal is to choose one direction.",
  goal_first_offer: "Your 90-day goal is to publish your first offer.",
  goal_first_sale: "Your 90-day goal is your first sales.",
  goal_consistent: "Your 90-day goal is steadier sales.",
  goal_audience: "Your 90-day goal is an audience that engages.",
  goal_time: "Your 90-day goal is less time on busywork.",
  clarity_none: "Who it's for and what you offer aren't clear yet.",
  clarity_audience: "You know who it's for, but not yet what to offer.",
  clarity_offer: "You have an offer, but the message isn't landing.",
  evidence_none: "You don't have evidence that people want it yet.",
  evidence_engagement: "You have engagement, but not yet requests or sales.",
  evidence_requests: "People have asked for it, which is real demand to act on.",
  evidence_sales: "You've made sales, which is real evidence to build on.",
  time_lt3: "You have under 3 hours a week.",
  time_3_7: "You have 3 to 7 hours a week.",
  owned_courses: "You have courses or templates you haven't finished.",
  owned_audience: "You already have content or an audience.",
  owned_product: "You already have a product, book or offer made.",
};

const STAGE_BY_OPTION: Record<string, UserStage> = {
  stage_exploring: "exploring",
  stage_starting: "starting",
  stage_launched: "launched",
  stage_selling: "selling",
  stage_pivoting: "pivoting",
};

const AVENUE_BY_OPTION: Record<string, Avenue | null> = {
  avenue_digital_products: "digital_products",
  avenue_quotes_faceless: "quotes_faceless",
  avenue_books_publishing: "books_publishing",
  avenue_asmr_visual: "asmr_visual",
  avenue_ai_avatar: "ai_avatar",
  avenue_brand_business: "brand_business",
  avenue_tools_workflows: "tools_workflows",
  avenue_unsure: null,
};

const SPEND_BY_OPTION: Record<string, SpendPreference> = {
  support_free: "free_only",
  support_open: "open_to_paid",
  support_undecided: "undecided",
};

const TIME_BY_OPTION: Record<string, TimeBand> = {
  time_lt3: "lt3",
  time_3_7: "3_7",
  time_8_15: "8_15",
  time_15p: "15p",
};

export type ValidationResult =
  | { ok: true; answers: Record<(typeof QUESTION_IDS)[number], string> }
  | { ok: false; missing: string[]; invalid: string[] };

/** Every question must have exactly one valid option ID. Unknown keys are ignored. */
export function validateAnswers(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, missing: [...QUESTION_IDS], invalid: [] };
  }
  const raw = input as Record<string, unknown>;
  const missing: string[] = [];
  const invalid: string[] = [];
  const clean: Record<string, string> = {};
  for (const q of ASSESSMENT_QUESTIONS) {
    const v = raw[q.id];
    if (v === undefined || v === null || v === "") {
      missing.push(q.id);
    } else if (typeof v !== "string" || !q.options.some((o) => o.id === v)) {
      invalid.push(q.id);
    } else {
      clean[q.id] = v;
    }
  }
  if (missing.length || invalid.length) return { ok: false, missing, invalid };
  return { ok: true, answers: clean as Record<(typeof QUESTION_IDS)[number], string> };
}

export interface ResultPlan {
  horizon: string;
  steps: string[];
  note: string | null;
}

export interface AssessmentResult {
  version: typeof ASSESSMENT_VERSION;
  answers: AssessmentAnswers;
  stage: UserStage;
  stageLabel: string;
  avenue: Avenue | null;
  avenueLabel: string;
  priority: Priority;
  priorityLabel: string;
  secondaryPriority: Priority | null;
  scores: Record<Priority, number>;
  /** Other priorities that tied with the winner before tie-break. */
  tiedWith: Priority[];
  confidence: "clear" | "close";
  reasons: string[];
  notes: string[];
  immediateAction: string;
  plan: ResultPlan;
  spend: SpendPreference;
  resources: RecommendedResource[];
  resourcesNote: string;
  creatorPath: CreatorPathLink | null;
  catalogFallback: boolean;
}

export type BuildResult =
  | { ok: true; result: AssessmentResult }
  | { ok: false; missing: string[]; invalid: string[] };

function emptyScores(): Record<Priority, number> {
  return { direction: 0, clarity: 0, validation: 0, conversion: 0, capacity: 0, systems: 0, growth: 0 };
}

const HORIZON: Record<TimeBand, string> = {
  lt3: "Over about 4 weeks, at a lighter pace",
  "3_7": "Over the next 2 to 3 weeks",
  "8_15": "Over the next 2 weeks",
  "15p": "Over the next 1 to 2 weeks",
};

function actionFor(priority: Priority, avenue: Avenue | null, owned: string): string {
  const noun = avenue ? AVENUE_NOUN[avenue] : "idea";
  switch (priority) {
    case "direction":
      return avenue
        ? `Write one sentence on who your ${noun} is for and why you're choosing it now, then commit to it for the next two weeks before adding anything new.`
        : "Write down the two avenues that pull you most, then pick the one you could start this week with what you already have. Commit to it for two weeks.";
    case "clarity":
      return `Write a one-line offer statement: "I help [who] get [result] with my ${noun}." Share it with three people in your audience and ask what is unclear.`;
    case "validation":
      return `Before building more, ask for a small yes: post one piece about your ${noun} and invite people to reply, join a waitlist or pre-order.`;
    case "conversion":
      return "Pick your one main offer and rewrite its first screen: who it's for, the problem it solves and one clear next step. Then show it to five people who already engaged.";
    case "capacity":
      return owned === "owned_courses"
        ? "Block two fixed sessions in your calendar this week and use them only to finish one course or template you already own."
        : "Block two fixed sessions in your calendar this week and protect them. Use them only to finish one thing you already started.";
    case "systems":
      return "List every repeated task from last week. Pick the one that takes the most time and turn it into a simple template or checklist.";
    case "growth":
      return "Look at what already sold and where those buyers found you. Create three new pieces for that same place this week.";
  }
}

function planFor(priority: Priority, avenue: Avenue | null): string[] {
  const noun = avenue ? AVENUE_NOUN[avenue] : "idea";
  switch (priority) {
    case "direction":
      return [
        "Choose one avenue and write down why it fits your time and what you already have.",
        `Make one small, real piece for that ${avenue ? noun : "avenue"} and share it publicly.`,
        "Review what you learned. Keep going, or switch once, on purpose.",
      ];
    case "clarity":
      return [
        "Describe one specific person you want to help and the problem they would pay to solve.",
        `Draft a simple offer for your ${noun} in one paragraph: who, problem, result.`,
        "Test the wording with real people and keep the version they repeat back to you.",
      ];
    case "validation":
      return [
        "Share your idea where your people already are and ask a direct question.",
        "Collect evidence: replies, waitlist sign-ups or pre-orders. Count them.",
        "Build only the smallest version that the people who said yes asked for.",
      ];
    case "conversion":
      return [
        "Rewrite your offer's first screen around one buyer and one problem.",
        "Invite the people who engaged to look at it and ask what stops them from buying.",
        "Fix the biggest objection, then run one clear sales test with a start and end date.",
      ];
    case "capacity":
      return [
        "Choose one project and pause the rest on purpose.",
        "Protect the same two time blocks every week.",
        "Finish one thing before starting or buying anything new.",
      ];
    case "systems":
      return [
        "Write down the steps of your most repeated task.",
        "Turn it into a template, checklist or batch session.",
        "Use the time you get back on the work that brings in buyers.",
      ];
    case "growth":
      return [
        "Find the channel and content that brought your recent buyers.",
        "Do more of that one thing on a steady schedule before adding a new channel.",
        "Ask recent buyers what almost stopped them, and use their words in your next pieces.",
      ];
  }
}

function ownedNote(owned: string, priority: Priority): string | null {
  if (owned === "owned_courses" && priority !== "capacity")
    return "Use the courses or templates you already own before buying anything new.";
  if (owned === "owned_tools") return "Start with the tools you already have.";
  if (owned === "owned_product") return "Start from the product you already made rather than building a new one.";
  if (owned === "owned_audience") return "Start with the content and audience you already have.";
  return null;
}

/**
 * Deterministic v2 scoring. Same answers always give the same result,
 * regardless of key order. Incomplete or invalid answers return ok:false.
 */
export function buildResult(input: unknown, catalog: unknown = CATALOG): BuildResult {
  const v = validateAnswers(input);
  if (!v.ok) return v;
  const a = v.answers;

  const scores = emptyScores();
  const contributions: Record<Priority, string[]> = {
    direction: [], clarity: [], validation: [], conversion: [], capacity: [], systems: [], growth: [],
  };
  for (const qid of QUESTION_IDS) {
    const opt = a[qid];
    const w = OPTION_WEIGHTS[opt] ?? {};
    for (const [p, pts] of Object.entries(w) as [Priority, number][]) {
      scores[p] += pts;
      if (OPTION_REASONS[opt]) contributions[p].push(OPTION_REASONS[opt]);
    }
  }

  const stage = STAGE_BY_OPTION[a.q_stage];
  const avenue = AVENUE_BY_OPTION[a.q_avenue] ?? null;
  const spend = SPEND_BY_OPTION[a.q_support];
  const time = TIME_BY_OPTION[a.q_time];
  const owned = a.q_owned;
  const hasSales = a.q_evidence === "evidence_sales";
  const hasOffer =
    stage === "launched" || stage === "selling" || owned === "owned_product" || hasSales;

  // Conflicting answers: take the more cautious read and say so.
  const notes: string[] = [];
  if (stage === "selling" && !hasSales) {
    scores.validation += 2;
    contributions.validation.push("You said you're selling, but didn't choose sales as your evidence.");
    notes.push(
      "You said you're selling regularly, but didn't choose sales as evidence. We took the more cautious read and checked demand first."
    );
  }
  if (stage === "exploring" && hasSales) {
    notes.push("You've already made sales, so this plan builds on that instead of starting over.");
  }

  const ranked = [...PRIORITY_ORDER].sort(
    (x, y) => scores[y] - scores[x] || PRIORITY_ORDER.indexOf(x) - PRIORITY_ORDER.indexOf(y)
  );
  const priority = ranked[0];
  const top = scores[priority];
  const tiedWith = ranked.slice(1).filter((p) => scores[p] === top);
  const runnerUp = ranked[1];
  const secondaryPriority = scores[runnerUp] > 0 ? runnerUp : null;
  const confidence = top - (scores[runnerUp] ?? 0) >= 2 ? "clear" : "close";

  if (tiedWith.length) {
    notes.push(
      `Your answers pointed equally to ${[priority, ...tiedWith]
        .map((p) => `"${PRIORITY_LABELS[p]}"`)
        .join(" and ")}. We put "${PRIORITY_LABELS[priority]}" first because it makes the others easier.`
    );
  }
  if (!avenue) {
    notes.push("You're not sure of your avenue yet, so we kept this plan avenue-neutral and didn't suggest anything to buy.");
  }

  const reasons = Array.from(new Set(contributions[priority])).slice(0, 4);

  const match = matchResources(
    { priority, secondaryPriority, avenue, stage, hasOffer, hasSales },
    catalog
  );
  let resources = match.resources;
  let resourcesNote: string;
  if (spend === "free_only") {
    resources = [];
    resourcesNote =
      "You asked for free or already-owned options, so no paid resources are suggested. Every step above works with what you have.";
  } else if (match.catalogError) {
    resourcesNote = "We couldn't load resource suggestions right now. Your plan above doesn't depend on them.";
  } else if (resources.length === 0) {
    resourcesNote =
      priority === "capacity"
        ? "No new resources for now. Finishing what you already have is the faster route."
        : "Nothing in the current catalog is a clear fit for this exact combination, so we're not suggesting one.";
  } else {
    resourcesNote = "Optional. You can take every step above without buying anything.";
  }

  const result: AssessmentResult = {
    version: ASSESSMENT_VERSION,
    answers: { ...a },
    stage,
    stageLabel: STAGE_LABELS[stage],
    avenue,
    avenueLabel: avenue ? AVENUE_LABELS[avenue] : "Not chosen yet",
    priority,
    priorityLabel: PRIORITY_LABELS[priority],
    secondaryPriority,
    scores,
    tiedWith,
    confidence,
    reasons,
    notes,
    immediateAction: actionFor(priority, avenue, owned),
    plan: { horizon: HORIZON[time], steps: planFor(priority, avenue), note: ownedNote(owned, priority) },
    spend,
    resources: resources.slice(0, 2),
    resourcesNote,
    creatorPath: creatorPathFor(avenue),
    catalogFallback: match.catalogError,
  };
  return { ok: true, result };
}

/** Compact, versioned snapshot for storage and webhooks. No personal data. */
export function resultSnapshot(r: AssessmentResult) {
  return {
    version: r.version,
    priority: r.priority,
    priorityLabel: r.priorityLabel,
    secondaryPriority: r.secondaryPriority,
    tiedWith: r.tiedWith,
    avenue: r.avenue,
    avenueLabel: r.avenueLabel,
    stage: r.stage,
    stageLabel: r.stageLabel,
    spend: r.spend,
    immediateAction: r.immediateAction,
    planHorizon: r.plan.horizon,
    planSteps: r.plan.steps,
    resources: r.resources.map((x) => ({ id: x.id, name: x.name, url: x.url })),
    creatorPath: r.creatorPath,
  };
}
