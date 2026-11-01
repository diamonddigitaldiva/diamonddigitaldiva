/**
 * The MAP v3 (map-v3.0) assessment definition, shared by the app and the
 * send-webhook edge function so the server can re-derive trusted results.
 *
 * Deno + Vite compatible: relative imports only, with explicit `.ts`.
 *
 * IDs are stable contracts stored with every submission. Never rename or
 * reuse a question, option or row ID (v1/v2 IDs are not reused here). To
 * change meaning, publish a new version. Wording comes from the owner's
 * approved copy; admins may override wording only.
 */

export const MAP_V3_VERSION = "map-v3.0" as const;

export type V3Kind = "single" | "multi" | "matrix" | "owned" | "text";

export interface V3Option {
  id: string;
  label: string;
  /** Selecting this clears every other selection (and vice versa). */
  exclusive?: boolean;
}

export interface V3Row {
  id: string;
  label: string;
}

export interface V3Question {
  id: string;
  kind: V3Kind;
  text: string;
  helper?: string;
  options: V3Option[];
  /** matrix only: one answer (from `options`) per row. */
  rows?: V3Row[];
  required: boolean;
  maxSelections?: number;
  /** Optional free-text side field stored under its own key. */
  sideText?: { key: string; label: string; maxLength: number; whenOption?: string };
  maxLength?: number;
  /** Visibility. Uses only answers to earlier questions. */
  showIf?: (a: V3Answers) => boolean;
}

export type V3AnswerValue = string | string[] | Record<string, string>;
export type V3Answers = Record<string, V3AnswerValue | undefined>;

// ---------------------------------------------------------------------------
// Owned-resource selector: the owner's paid shortlist. Selecting one only
// records ownership. It does NOT make an item live, eligible or recommendable.
// Owner groups (main/middle/low) are not stages or recommendation priority.
// ---------------------------------------------------------------------------
export interface OwnedResource {
  id: string;
  name: string;
  group: "main" | "middle" | "low";
  /** v3 catalog entry this ownership maps to, when one exists. */
  catalogId?: string;
  /** Extra exact names used for conservative free-text matching. */
  aliases?: string[];
}

export const OWNED_RESOURCES: OwnedResource[] = [
  { id: "res_secret_sauce", name: "Secret Sauce", group: "main", catalogId: "tss", aliases: ["The Secret Sauce", "TSS"] },
  { id: "res_aica", name: "AICA 2.0", group: "main", catalogId: "aica", aliases: ["AI Creator Academy 2.0", "AICA"] },
  { id: "res_dwa", name: "DWA 4.0", group: "main", catalogId: "dwa", aliases: ["Digital Wealth Academy 4.0", "Digital Wealth Academy", "DWA"] },
  { id: "res_passive_by_design", name: "Passive by Design", group: "main", catalogId: "passive-by-design" },
  { id: "res_paid_with_ai", name: "Paid with AI", group: "main", catalogId: "paid-with-ai" },
  { id: "res_powerhorse", name: "Powerhorse Academy", group: "main", catalogId: "powerhorse-academy", aliases: ["The Powerhorse Academy"] },
  { id: "res_cfw", name: "CFW", group: "main", catalogId: "cfw", aliases: ["Create Faceless Wealth"] },
  { id: "res_faceless_launch_formula", name: "Faceless Launch Formula", group: "middle" },
  { id: "res_aifluencer_studio", name: "AIFluencer Studio", group: "middle", catalogId: "aifluencer-studio" },
  { id: "res_quote_society", name: "Quote Society", group: "middle" },
  { id: "res_pin_prompt_profit", name: "Pin Prompt & Profit", group: "middle" },
  { id: "res_after_the_avatar", name: "After the Avatar", group: "middle" },
  { id: "res_insta_expand", name: "Insta Expand", group: "middle", catalogId: "insta-expand" },
  { id: "res_list_to_pinterest", name: "List to Pinterest", group: "low" },
  { id: "res_4_fig_days", name: "4 Fig Days", group: "low" },
  { id: "res_4_fig_clients", name: "4 Fig Clients", group: "low" },
  { id: "res_post_to_profit", name: "Post to Profit", group: "low" },
  { id: "res_offer_fix", name: "Offer Fix", group: "low", catalogId: "the-offer-fix", aliases: ["The Offer Fix"] },
  { id: "res_39k_bundle", name: "39K Celebration Bundle", group: "low" },
  { id: "res_grace_grit", name: "Grace & Grit", group: "low" },
  { id: "res_stack_method", name: "Stack Method", group: "low" },
  { id: "res_colorbot_studio", name: "ColorBot Studio", group: "low" },
  { id: "res_low_ticket_secrets", name: "Low-Ticket Secrets", group: "low" },
  { id: "res_daily_sales_rhythm", name: "Daily Sales Rhythm", group: "low" },
  { id: "res_100k_threads", name: "100K Threads Challenge", group: "low" },
  { id: "res_first_sale_challenge", name: "$0 - First Sale Challenge", group: "low" },
  { id: "res_kdp_blueprint", name: "Faceless Amazon KDP Blueprint", group: "low", catalogId: "faceless-amazon-kdp-blueprint" },
  { id: "res_ai_podcast_kit", name: "AI-Podcast Kit 10 Min Workflow", group: "low" },
  { id: "res_selling_made_simple", name: "Selling Made Simple", group: "low" },
  { id: "res_ai_to_sales", name: "AI to Sales", group: "low" },
  { id: "res_molly_rosie_archive", name: "Molly X Rosie Archive", group: "low" },
  { id: "res_vantage_system", name: "Vantage System", group: "low" },
  { id: "res_monetize_it", name: "Monetize It", group: "low" },
  { id: "res_prompt_to_sales", name: "Prompt to Sales", group: "low", catalogId: "prompt-to-sales" },
];

export const OWNED_STATUS_OPTIONS: V3Option[] = [
  { id: "own_none", label: "I haven’t purchased anything yet.", exclusive: true },
  { id: "own_need_help", label: "I own resources but would like help using them." },
];

const OWNED_IDS = new Set(OWNED_RESOURCES.map((r) => r.id));

// ---------------------------------------------------------------------------
// Derived visibility helpers (use only earlier answers).
// ---------------------------------------------------------------------------
const list = (v: V3AnswerValue | undefined): string[] => (Array.isArray(v) ? v : []);
const one = (v: V3AnswerValue | undefined): string | undefined => (typeof v === "string" ? v : undefined);

const STARTED_WHERE = new Set(["where_building", "where_inconsistent", "where_consistent", "where_redirect"]);

/** Already started: q1 says so, or q4 shows existing content/page/audience or an offer. */
export function isStarted(a: V3Answers): boolean {
  const w = one(a.m3_where);
  if (w && STARTED_WHERE.has(w)) return true;
  const b = list(a.m3_bring);
  return b.includes("bring_content") || b.includes("bring_offer");
}

/** Interests whose catalog options can depend on the kind of computer. */
export const DEVICE_SENSITIVE_INTERESTS = ["int_ai_services", "int_services", "int_business", "int_digital_products"];
/** Interests whose catalog options can depend on a paid Claude plan. */
export const CLAUDE_RELEVANT_INTERESTS = ["int_ai_services", "int_services"];

export type Platform = "phone" | "windows" | "mac" | "chromebook";
const DEVICE_TO_PLATFORM: Record<string, Platform> = {
  dev_phone: "phone",
  dev_windows: "windows",
  dev_mac: "mac",
  dev_chromebook: "chromebook",
};
const DETAIL_TO_PLATFORM: Record<string, Platform> = {
  devp_phone: "phone",
  devp_windows: "windows",
  devp_mac: "mac",
  devp_chromebook: "chromebook",
};

/** Platforms the person can use. null = unknown (never assume a desktop). */
export function effectivePlatforms(a: V3Answers): Set<Platform> | null {
  const d = one(a.m3_device);
  if (!d) return null;
  if (d !== "dev_several") return new Set([DEVICE_TO_PLATFORM[d]]);
  const detail = list(a.m3_devices_available).map((x) => DETAIL_TO_PLATFORM[x]).filter(Boolean);
  return detail.length ? new Set(detail) : null;
}

function deviceDetailNeeded(a: V3Answers): boolean {
  if (one(a.m3_device) !== "dev_several") return false;
  const ints = list(a.m3_interests);
  return isStarted(a) || ints.some((i) => DEVICE_SENSITIVE_INTERESTS.includes(i));
}

function claudeQuestionNeeded(a: V3Answers): boolean {
  const ints = list(a.m3_interests);
  if (!ints.some((i) => CLAUDE_RELEVANT_INTERESTS.includes(i))) return false;
  const p = effectivePlatforms(a);
  return !!p && (p.has("windows") || p.has("mac"));
}

// ---------------------------------------------------------------------------
// Questions (owner-approved wording, preserved).
// ---------------------------------------------------------------------------
export const V3_QUESTIONS: V3Question[] = [
  {
    id: "m3_where",
    kind: "single",
    required: true,
    text: "Where are you right now?",
    options: [
      { id: "where_new", label: "I’m new and exploring how to get started." },
      { id: "where_learning", label: "I’ve been learning, but haven’t put anything into action." },
      { id: "where_building", label: "I’ve started creating or building, but haven’t made a sale." },
      { id: "where_inconsistent", label: "I’ve made sales, but they aren’t consistent." },
      { id: "where_consistent", label: "I’m making consistent sales and want to grow." },
      { id: "where_redirect", label: "I have experience, but want a different direction." },
    ],
  },
  {
    id: "m3_help",
    kind: "multi",
    required: true,
    text: "What would you like help with?",
    helper: "Choose all that apply.",
    options: [
      { id: "help_realistic", label: "Find a realistic way to earn online." },
      { id: "help_activate", label: "Put what I already know or own into action." },
      { id: "help_improve", label: "Improve something I’ve already started." },
      { id: "help_blocker", label: "Figure out what’s holding me back." },
      { id: "help_add_stream", label: "Add another income stream." },
      { id: "help_new_direction", label: "Explore a different direction." },
    ],
  },
  {
    id: "m3_interests",
    kind: "multi",
    required: true,
    text: "Which possibilities interest you?",
    helper: "Choose all that apply. You don’t need to decide yet.",
    options: [
      { id: "int_digital_products", label: "Creating and selling digital products." },
      { id: "int_affiliate", label: "Recommending products as an affiliate." },
      { id: "int_quotes", label: "Building and monetizing a quote or theme page." },
      { id: "int_ai_avatar", label: "Creating AI avatars, images or videos." },
      { id: "int_publishing", label: "Publishing books, coloring books or printables." },
      { id: "int_social", label: "Growing and earning through social platforms such as Instagram, Threads, Pinterest or TikTok." },
      { id: "int_ai_services", label: "Using AI to provide services, build useful tools or create systems for businesses." },
      { id: "int_services", label: "Offering services to clients or businesses." },
      { id: "int_asmr", label: "Creating ASMR or other visual entertainment." },
      { id: "int_business", label: "Growing a business or brand I already have." },
      { id: "int_no_social", label: "Exploring ways to earn without relying on social media." },
      { id: "int_discover", label: "I’d like help discovering what fits me." },
    ],
  },
  {
    id: "m3_platforms",
    kind: "multi",
    required: true,
    text: "Which platforms do you use or want to learn?",
    helper: "Choose all that apply.",
    // Only the social-platforms interest triggers this. AI avatars or services never imply social.
    showIf: (a) => list(a.m3_interests).includes("int_social"),
    options: [
      { id: "plat_instagram", label: "Instagram" },
      { id: "plat_threads", label: "Threads" },
      { id: "plat_pinterest", label: "Pinterest" },
      { id: "plat_tiktok", label: "TikTok" },
      { id: "plat_facebook", label: "Facebook" },
      { id: "plat_youtube", label: "YouTube" },
      { id: "plat_other", label: "Other" },
      { id: "plat_unsure", label: "Not sure yet", exclusive: true },
    ],
    sideText: { key: "m3_platforms_other", label: "Other platform (optional)", maxLength: 100, whenOption: "plat_other" },
  },
  {
    id: "m3_bring",
    kind: "multi",
    required: true,
    text: "What do you already bring to the table?",
    helper: "Choose all that apply.",
    options: [
      { id: "bring_knowledge", label: "Knowledge or experience I could share." },
      { id: "bring_skill", label: "A creative skill or hobby." },
      { id: "bring_clients", label: "Experience helping customers or clients." },
      { id: "bring_content", label: "Content, a page or an audience." },
      { id: "bring_offer", label: "A product, book, service or affiliate offer." },
      { id: "bring_purchased", label: "Courses, templates or tools I’ve purchased." },
      { id: "bring_unsure", label: "I’m not sure how my experience could translate yet.", exclusive: true },
    ],
  },
  {
    id: "m3_working_on",
    kind: "multi",
    required: true,
    text: "What are you currently working on?",
    helper: "Choose all that apply.",
    showIf: isStarted,
    options: [
      { id: "work_products", label: "My own digital products." },
      { id: "work_affiliate", label: "Affiliate marketing." },
      { id: "work_quotes", label: "Quote or theme pages." },
      { id: "work_ai", label: "AI avatars or AI content." },
      { id: "work_books", label: "Books, coloring books or printables." },
      { id: "work_services", label: "Client services." },
      { id: "work_business", label: "Growing an existing business." },
      { id: "work_learning", label: "I’m still learning and setting things up." },
    ],
  },
  {
    id: "m3_obstacle",
    kind: "single",
    required: true,
    text: "What feels like your biggest obstacle right now?",
    showIf: isStarted,
    options: [
      { id: "obst_choose", label: "Choosing what to focus on." },
      { id: "obst_launch", label: "Finishing and launching." },
      { id: "obst_reach", label: "Reaching the right people." },
      { id: "obst_explain", label: "Explaining my offer so people understand its value." },
      { id: "obst_convert", label: "Turning attention or conversations into sales." },
      { id: "obst_content", label: "Creating content that feels consistent and recognizable." },
      { id: "obst_routine", label: "Finding a routine I can maintain." },
      { id: "obst_systems", label: "Setting up tools, systems or automation." },
      { id: "obst_add_stream", label: "Choosing an additional income stream that fits." },
      { id: "obst_unsure", label: "I’m not sure what the problem is." },
    ],
  },
  {
    id: "m3_working",
    kind: "multi",
    required: true,
    text: "What is already working?",
    helper: "Choose all that apply.",
    showIf: isStarted,
    options: [
      { id: "works_engage", label: "People engage with my content." },
      { id: "works_interest", label: "People ask questions or show interest." },
      { id: "works_clicks", label: "People click my links or join my email list." },
      { id: "works_sales", label: "I’ve made sales or booked clients." },
      { id: "works_routine", label: "I have a routine or system I can maintain." },
      { id: "works_early", label: "I’m too early to tell.", exclusive: true },
      { id: "works_little", label: "I’m putting in effort but seeing little response." },
    ],
  },
  {
    id: "m3_comfort",
    kind: "matrix",
    required: true,
    text: "How would you feel about these ways of working?",
    helper: "Choose one answer for each.",
    rows: [
      { id: "cw_camera", label: "Appearing on camera." },
      { id: "cw_voice", label: "Using my voice without showing my face." },
      { id: "cw_avatar", label: "Creating with an AI avatar." },
      { id: "cw_faceless", label: "Making content without my face or voice." },
      { id: "cw_messages", label: "Talking with potential customers through messages." },
      { id: "cw_outreach", label: "Reaching out to businesses or potential clients." },
    ],
    options: [
      { id: "cmf_comfortable", label: "Comfortable" },
      { id: "cmf_open", label: "Open to learning" },
      { id: "cmf_avoid", label: "Prefer to avoid" },
    ],
  },
  {
    id: "m3_time",
    kind: "single",
    required: true,
    text: "How much time can you realistically give this each week?",
    options: [
      { id: "time3_lt3", label: "Under 3 hours." },
      { id: "time3_3_5", label: "3 to 5 hours." },
      { id: "time3_6_10", label: "6 to 10 hours." },
      { id: "time3_10p", label: "More than 10 hours." },
      { id: "time3_flex", label: "My availability changes, so I need flexibility." },
    ],
  },
  {
    id: "m3_device",
    kind: "single",
    required: true,
    text: "What will you mainly use to do the work?",
    options: [
      { id: "dev_phone", label: "A phone or tablet." },
      { id: "dev_windows", label: "A Windows computer." },
      { id: "dev_mac", label: "A Mac." },
      { id: "dev_chromebook", label: "A Chromebook." },
      { id: "dev_several", label: "I have access to several devices." },
    ],
  },
  {
    id: "m3_devices_available",
    kind: "multi",
    required: true,
    text: "Which of these can you use for this work?",
    helper: "Choose all that apply. Some options need a specific kind of computer.",
    showIf: deviceDetailNeeded,
    options: [
      { id: "devp_phone", label: "A phone or tablet" },
      { id: "devp_windows", label: "A Windows computer" },
      { id: "devp_mac", label: "A Mac" },
      { id: "devp_chromebook", label: "A Chromebook" },
    ],
  },
  {
    id: "m3_claude",
    kind: "single",
    required: true,
    text: "Do you have a paid Claude plan?",
    helper: "Some AI service workflows need one. Your answer only changes which options we show.",
    showIf: claudeQuestionNeeded,
    options: [
      { id: "claude_yes", label: "Yes" },
      { id: "claude_consider", label: "Willing to consider" },
      { id: "claude_no", label: "No" },
    ],
  },
  {
    id: "m3_owned",
    kind: "owned",
    required: false,
    text: "What resources do you already have?",
    helper: "Select any courses or tools you own, or type their names.",
    options: [...OWNED_STATUS_OPTIONS, ...OWNED_RESOURCES.map((r) => ({ id: r.id, label: r.name }))],
    sideText: { key: "m3_owned_other", label: "Other resources you own (optional)", maxLength: 300 },
  },
  {
    id: "m3_budget",
    kind: "single",
    required: true,
    text: "What spending range feels comfortable for your next step?",
    options: [
      { id: "budget_free", label: "Free resources and what I already own." },
      { id: "budget_50", label: "Up to $50." },
      { id: "budget_100", label: "$51 to $100." },
      { id: "budget_200", label: "$101 to $200." },
      { id: "budget_300", label: "$201 to $300." },
      { id: "budget_300p", label: "More than $300." },
      { id: "budget_unsure", label: "I’m unsure. Show me the options without assuming I’m ready to buy." },
    ],
  },
  {
    id: "m3_support",
    kind: "multi",
    required: true,
    maxSelections: 2,
    text: "What kind of support would help you most?",
    helper: "Choose up to two.",
    options: [
      { id: "sup_guide", label: "A clear guide I can follow independently." },
      { id: "sup_video", label: "Step-by-step video lessons." },
      { id: "sup_community", label: "A community where I can ask questions." },
      { id: "sup_live", label: "Live teaching or feedback." },
      { id: "sup_tools", label: "Templates, prompts or tools that help me do the work." },
      { id: "sup_decide", label: "Help narrowing my options and making a decision." },
      { id: "sup_unsure", label: "I’m not sure yet.", exclusive: true },
    ],
  },
  {
    id: "m3_notes",
    kind: "text",
    required: false,
    maxLength: 1000,
    text: "Is there anything else your recommendation should consider?",
    helper: "Tell us about a goal, interest, limitation or experience we haven’t covered.",
    options: [],
  },
];

export const V3_QUESTION_IDS = V3_QUESTIONS.map((q) => q.id);
export const V3_SIDE_TEXT_KEYS = V3_QUESTIONS.flatMap((q) => (q.sideText ? [q.sideText.key] : []));

export function getV3Question(id: string): V3Question | undefined {
  return V3_QUESTIONS.find((q) => q.id === id);
}

/** Questions visible for these answers, in order. Only earlier answers matter. */
export function visibleV3Questions(a: V3Answers): V3Question[] {
  return V3_QUESTIONS.filter((q) => !q.showIf || q.showIf(a));
}

// ---------------------------------------------------------------------------
// Client helpers
// ---------------------------------------------------------------------------

/**
 * Toggle an option in a multi/owned question. Exclusive options clear the
 * rest; picking any other option clears exclusive ones. Returns the same
 * array (unchanged) when `maxSelections` would be exceeded.
 */
export function toggleMulti(q: V3Question, current: string[], optionId: string): string[] {
  const opt = q.options.find((o) => o.id === optionId);
  if (!opt) return current;
  if (current.includes(optionId)) return current.filter((x) => x !== optionId);
  if (opt.exclusive) return [optionId];
  const exclusive = new Set(q.options.filter((o) => o.exclusive).map((o) => o.id));
  const next = [...current.filter((x) => !exclusive.has(x)), optionId];
  if (q.maxSelections && next.length > q.maxSelections) return current;
  return next;
}

/** Remove answers to questions that are now hidden, and orphaned side text. */
export function pruneV3(a: V3Answers): V3Answers {
  const out: V3Answers = {};
  // Visibility is evaluated progressively so a hidden answer can't keep a later question visible.
  for (const q of V3_QUESTIONS) {
    if (q.showIf && !q.showIf(out)) continue;
    if (a[q.id] !== undefined) out[q.id] = a[q.id];
    if (q.sideText) {
      const t = a[q.sideText.key];
      const parentOk = !q.sideText.whenOption || list(a[q.id]).includes(q.sideText.whenOption);
      if (typeof t === "string" && parentOk) out[q.sideText.key] = t;
    }
  }
  return out;
}

/** Whether a question has a complete answer (optional questions always pass). */
export function isV3Answered(q: V3Question, a: V3Answers): boolean {
  const v = a[q.id];
  if (!q.required) return true;
  switch (q.kind) {
    case "single":
      return typeof v === "string" && q.options.some((o) => o.id === v);
    case "multi":
      return Array.isArray(v) && v.length > 0;
    case "matrix":
      return !!v && typeof v === "object" && !Array.isArray(v) && (q.rows ?? []).every((r) => typeof (v as Record<string, string>)[r.id] === "string");
    default:
      return true;
  }
}

// ---------------------------------------------------------------------------
// Validation (client and server). Unknown keys are dropped; answers to hidden
// questions are dropped (reported in `pruned`); anything malformed fails.
// ---------------------------------------------------------------------------
export type V3Validation =
  | { ok: true; answers: V3Answers; pruned: string[]; missing?: undefined; invalid?: undefined }
  | { ok: false; missing: string[]; invalid: string[]; answers?: undefined; pruned?: undefined };

// deno-lint-ignore no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
export function cleanText(v: unknown, max: number): string | null | "invalid" {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return "invalid";
  const t = v.replace(CONTROL, "").trim();
  if (!t) return null;
  if (t.length > max) return "invalid";
  return t;
}

export function validateV3(input: unknown): V3Validation {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, missing: V3_QUESTIONS.filter((q) => q.required && !q.showIf).map((q) => q.id), invalid: [] };
  }
  const raw = input as Record<string, unknown>;
  const clean: V3Answers = {};
  const missing: string[] = [];
  const invalid: string[] = [];
  const pruned: string[] = [];

  for (const q of V3_QUESTIONS) {
    const visible = !q.showIf || q.showIf(clean);
    const v = raw[q.id];
    if (!visible) {
      if (v !== undefined) pruned.push(q.id);
      if (q.sideText && raw[q.sideText.key] !== undefined) pruned.push(q.sideText.key);
      continue;
    }
    if (q.kind === "text") {
      const t = cleanText(v, q.maxLength ?? 1000);
      if (t === "invalid") invalid.push(q.id);
      else if (t !== null) clean[q.id] = t;
      continue;
    }
    const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
    if (empty) {
      if (q.required) missing.push(q.id);
    } else {
      const ok = validateValue(q, v);
      if (ok === null) invalid.push(q.id);
      else clean[q.id] = ok;
    }
    if (q.sideText) {
      const t = cleanText(raw[q.sideText.key], q.sideText.maxLength);
      const parentOk = !q.sideText.whenOption || list(clean[q.id]).includes(q.sideText.whenOption);
      if (t === "invalid") invalid.push(q.sideText.key);
      else if (t !== null) {
        if (parentOk) clean[q.sideText.key] = t;
        else pruned.push(q.sideText.key);
      }
    }
  }
  if (missing.length || invalid.length) return { ok: false, missing, invalid };
  return { ok: true, answers: clean, pruned };
}

function validateValue(q: V3Question, v: unknown): V3AnswerValue | null {
  const ids = new Set(q.options.map((o) => o.id));
  switch (q.kind) {
    case "single":
      return typeof v === "string" && ids.has(v) ? v : null;
    case "multi":
    case "owned": {
      if (!Array.isArray(v) || v.length > 40) return null;
      if (!v.every((x) => typeof x === "string" && ids.has(x))) return null;
      const arr = v as string[];
      if (new Set(arr).size !== arr.length) return null;
      const excl = q.options.filter((o) => o.exclusive).map((o) => o.id);
      if (arr.length > 1 && arr.some((x) => excl.includes(x))) return null;
      if (q.maxSelections && arr.length > q.maxSelections) return null;
      if (q.kind === "owned" && !arr.every((x) => OWNED_IDS.has(x) || OWNED_STATUS_OPTIONS.some((o) => o.id === x))) return null;
      // Canonical order (question order) so stored answers and results are order-independent.
      return q.options.map((o) => o.id).filter((id) => arr.includes(id));
    }
    case "matrix": {
      if (!v || typeof v !== "object" || Array.isArray(v)) return null;
      const o = v as Record<string, unknown>;
      const rows = q.rows ?? [];
      if (Object.keys(o).length !== rows.length) return null;
      const out: Record<string, string> = {};
      for (const r of rows) {
        const x = o[r.id];
        if (typeof x !== "string" || !ids.has(x)) return null;
        out[r.id] = x;
      }
      return out;
    }
    case "text": {
      const t = cleanText(v, q.maxLength ?? 1000);
      return t === "invalid" || t === null ? null : t;
    }
  }
  return null;
}
