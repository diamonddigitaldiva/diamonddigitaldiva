export type Avenue =
  | "digital_products"
  | "quotes_faceless"
  | "books_publishing"
  | "asmr_visual"
  | "ai_avatar"
  | "brand_business"
  | "tools_workflows";

export type UserStage = "exploring" | "starting" | "launched" | "selling" | "pivoting";

export type Priority =
  | "direction"
  | "clarity"
  | "validation"
  | "conversion"
  | "capacity"
  | "systems"
  | "growth";

export type SpendPreference = "free_only" | "open_to_paid" | "undecided";

export type TimeBand = "lt3" | "3_7" | "8_15" | "15p";

/** Answers keyed by stable question ID, value = stable option ID. */
export type AssessmentAnswers = Record<string, string>;
