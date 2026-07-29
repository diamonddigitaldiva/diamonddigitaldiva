import { describe, it, expect } from "vitest";
import { computeResults, STAGE_MAP, QUESTIONS } from "@/lib/quizData";

/**
 * These tests DOCUMENT the current behaviour of `computeResults`.
 * They intentionally do not assert a "better" model — scoring changes are
 * blocked pending owner approval of the revised question/outcome model.
 *
 * Current behaviour:
 *  - Flat tally: each answer letter maps to a stage code via STAGE_MAP.
 *  - Winner = highest tally; ties resolve by JS object insertion order,
 *    i.e. the stage whose first matching answer appeared earliest.
 *  - secondary = second entry of the sorted list, or null if only one stage.
 *  - Unknown/malformed answers are ignored.
 *  - With no scorable answers, fallback is { primary: "CFW", secondary: null }.
 */
describe("computeResults", () => {
  const letterFor = (stage: string) =>
    Object.entries(STAGE_MAP).find(([, s]) => s === stage)![0];

  it("returns a clear winner when one stage dominates", () => {
    const stage = STAGE_MAP["A"];
    const letter = "A";
    const answers = { 0: letter, 1: letter, 2: letter };
    expect(computeResults(answers).primary).toBe(stage);
  });

  it("returns the runner-up as secondary", () => {
    const a = "A";
    const other = Object.keys(STAGE_MAP).find((k) => STAGE_MAP[k] !== STAGE_MAP["A"])!;
    const result = computeResults({ 0: a, 1: a, 2: other });
    expect(result.primary).toBe(STAGE_MAP[a]);
    expect(result.secondary).toBe(STAGE_MAP[other]);
  });

  it("documents tie behaviour: first-seen stage wins", () => {
    const a = "A";
    const other = Object.keys(STAGE_MAP).find((k) => STAGE_MAP[k] !== STAGE_MAP["A"])!;
    expect(computeResults({ 0: a, 1: other }).primary).toBe(STAGE_MAP[a]);
    // Reversing the answer order flips the winner — ties are order-dependent.
    expect(computeResults({ 0: other, 1: a }).primary).toBe(STAGE_MAP[other]);
  });

  it("returns null secondary when only one stage is scored", () => {
    expect(computeResults({ 0: "A" }).secondary).toBeNull();
  });

  it("falls back to CFW on empty input", () => {
    expect(computeResults({})).toEqual({ primary: "CFW", secondary: null });
  });

  it("ignores unknown or malformed answer keys", () => {
    expect(computeResults({ 0: "ZZZ", 1: "", 2: "!" })).toEqual({
      primary: "CFW",
      secondary: null,
    });
    const a = "A";
    expect(computeResults({ 0: a, 1: "ZZZ" }).primary).toBe(STAGE_MAP[a]);
  });

  it("every question option letter maps to a known stage", () => {
    for (const q of QUESTIONS) {
      for (const key of Object.keys(q.options)) {
        expect(STAGE_MAP[key], `option ${key} has no stage mapping`).toBeTruthy();
      }
    }
  });

  it("every stage in STAGE_MAP is reachable from at least one option", () => {
    const optionKeys = new Set(QUESTIONS.flatMap((q) => Object.keys(q.options)));
    const reachable = new Set([...optionKeys].map((k) => STAGE_MAP[k]).filter(Boolean));
    for (const stage of new Set(Object.values(STAGE_MAP))) {
      expect(reachable.has(stage), `stage ${stage} is unreachable`).toBe(true);
    }
    expect(letterFor([...reachable][0])).toBeTruthy();
  });
});
