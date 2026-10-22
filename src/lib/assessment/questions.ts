/**
 * The MAP v2 assessment definition.
 *
 * IDs are stable contracts: they are stored with every submission, so never
 * rename or reuse a question or option ID. To change meaning, publish a new
 * ASSESSMENT_VERSION instead. Wording may be changed (admin overrides), but
 * IDs, order and scoring live in code only.
 */

export const ASSESSMENT_VERSION = "map-v2.0" as const;
export type AssessmentVersion = typeof ASSESSMENT_VERSION;

export interface AssessmentOption {
  id: string;
  label: string;
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  options: AssessmentOption[];
}

export const QUESTION_IDS = [
  "q_stage",
  "q_avenue",
  "q_goal",
  "q_clarity",
  "q_evidence",
  "q_time",
  "q_owned",
  "q_support",
] as const;
export type QuestionId = (typeof QUESTION_IDS)[number];

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "q_stage",
    text: "Where are you right now?",
    options: [
      { id: "stage_exploring", label: "Exploring. I haven't picked a direction yet." },
      { id: "stage_starting", label: "Starting. I've picked a direction, but nothing is live." },
      { id: "stage_launched", label: "Launched. Something is live, but sales are uneven or haven't started." },
      { id: "stage_selling", label: "Selling. I make regular sales and want to grow." },
      { id: "stage_pivoting", label: "Pivoting. What I built no longer fits." },
    ],
  },
  {
    id: "q_avenue",
    text: "Which creator avenue fits you best right now?",
    options: [
      { id: "avenue_digital_products", label: "Digital products or services" },
      { id: "avenue_quotes_faceless", label: "Quote pages or faceless content" },
      { id: "avenue_books_publishing", label: "Books and publishing" },
      { id: "avenue_asmr_visual", label: "ASMR or visual content" },
      { id: "avenue_ai_avatar", label: "AI or avatar creation" },
      { id: "avenue_brand_business", label: "Growing a brand or business" },
      { id: "avenue_tools_workflows", label: "Creator tools and workflows" },
      { id: "avenue_unsure", label: "I'm not sure yet" },
    ],
  },
  {
    id: "q_goal",
    text: "What do you most want in the next 90 days?",
    options: [
      { id: "goal_choose", label: "Choose one direction and commit to it" },
      { id: "goal_first_offer", label: "Finish and publish my first offer" },
      { id: "goal_first_sale", label: "Make my first sales" },
      { id: "goal_consistent", label: "Make my sales more consistent" },
      { id: "goal_audience", label: "Grow an audience that actually engages" },
      { id: "goal_time", label: "Spend less time on busywork" },
    ],
  },
  {
    id: "q_clarity",
    text: "How clear are you on who it's for and what you offer?",
    options: [
      { id: "clarity_none", label: "Not clear on either yet" },
      { id: "clarity_audience", label: "I know who it's for, but not what to offer" },
      { id: "clarity_offer", label: "I have an offer, but the message isn't landing" },
      { id: "clarity_clear", label: "Both are clear" },
    ],
  },
  {
    id: "q_evidence",
    text: "What evidence do you have that people want it?",
    options: [
      { id: "evidence_none", label: "None yet" },
      { id: "evidence_engagement", label: "Engagement, like comments, saves or followers" },
      { id: "evidence_requests", label: "People have asked for it or joined a waitlist" },
      { id: "evidence_sales", label: "I've made sales" },
    ],
  },
  {
    id: "q_time",
    text: "How much time can you give this each week?",
    options: [
      { id: "time_lt3", label: "Under 3 hours" },
      { id: "time_3_7", label: "3 to 7 hours" },
      { id: "time_8_15", label: "8 to 15 hours" },
      { id: "time_15p", label: "More than 15 hours" },
    ],
  },
  {
    id: "q_owned",
    text: "What's the most useful thing you already have?",
    options: [
      { id: "owned_nothing", label: "Nothing yet. I'm starting fresh." },
      { id: "owned_tools", label: "Tools or apps, like Canva or an AI tool" },
      { id: "owned_courses", label: "Courses or templates I haven't finished" },
      { id: "owned_audience", label: "Content or an audience I've built" },
      { id: "owned_product", label: "A product, book or offer that's already made" },
    ],
  },
  {
    id: "q_support",
    text: "How do you want to move forward?",
    options: [
      { id: "support_free", label: "Only free options or what I already own" },
      { id: "support_open", label: "Open to paid support if it clearly fits" },
      { id: "support_undecided", label: "Not sure yet" },
    ],
  },
];

/** Every option ID across the assessment (IDs are globally unique). */
export const ALL_OPTION_IDS: ReadonlySet<string> = new Set(
  ASSESSMENT_QUESTIONS.flatMap((q) => q.options.map((o) => o.id))
);

export function getQuestion(id: string): AssessmentQuestion | undefined {
  return ASSESSMENT_QUESTIONS.find((q) => q.id === id);
}
