import { describe, it, expect } from "vitest";
import { ASSESSMENT_QUESTIONS, ASSESSMENT_VERSION, applyTextOverrides, buildResult } from "@/lib/assessment";

describe("admin wording overrides", () => {
  it("changes wording only and keeps IDs and order", () => {
    const out = applyTextOverrides(
      ASSESSMENT_QUESTIONS,
      [
        { assessment_version: ASSESSMENT_VERSION, item_key: "q_stage", text: "Where are you today?" },
        { assessment_version: ASSESSMENT_VERSION, item_key: "q_stage.stage_selling", text: "Selling steadily" },
      ],
      ASSESSMENT_VERSION
    );
    expect(out[0].text).toBe("Where are you today?");
    expect(out[0].options.find((o) => o.id === "stage_selling")?.label).toBe("Selling steadily");
    expect(out.map((q) => q.id)).toEqual(ASSESSMENT_QUESTIONS.map((q) => q.id));
    expect(out.flatMap((q) => q.options.map((o) => o.id))).toEqual(
      ASSESSMENT_QUESTIONS.flatMap((q) => q.options.map((o) => o.id))
    );
  });

  it("ignores other versions, unknown keys, empty and oversized text, and garbage", () => {
    const out = applyTextOverrides(
      ASSESSMENT_QUESTIONS,
      [
        { assessment_version: "legacy-v1", item_key: "q_stage", text: "old" },
        { assessment_version: ASSESSMENT_VERSION, item_key: "q_unknown", text: "x" },
        { assessment_version: ASSESSMENT_VERSION, item_key: "q_goal", text: "   " },
        { assessment_version: ASSESSMENT_VERSION, item_key: "q_time", text: "y".repeat(301) },
        null,
      ],
      ASSESSMENT_VERSION
    );
    expect(out).toEqual(ASSESSMENT_QUESTIONS);
    expect(applyTextOverrides(ASSESSMENT_QUESTIONS, "nope", ASSESSMENT_VERSION)).toEqual(ASSESSMENT_QUESTIONS);
  });

  it("legacy v1 question rows cannot change v2 scoring", () => {
    const answers = {
      q_stage: "stage_exploring",
      q_avenue: "avenue_unsure",
      q_goal: "goal_choose",
      q_clarity: "clarity_none",
      q_evidence: "evidence_none",
      q_time: "time_3_7",
      q_owned: "owned_nothing",
      q_support: "support_undecided",
    };
    const before = buildResult(answers);
    // Legacy rows look like { question_index, question_text, options: {A..L} }.
    applyTextOverrides(ASSESSMENT_QUESTIONS, [{ question_index: 0, options: { A: "x" } }], ASSESSMENT_VERSION);
    expect(buildResult(answers)).toEqual(before);
  });
});
