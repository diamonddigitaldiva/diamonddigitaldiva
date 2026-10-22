import { describe, it, expect } from "vitest";
import {
  ASSESSMENT_QUESTIONS,
  ASSESSMENT_VERSION,
  EXCLUDED_IDS,
  CATALOG,
  buildResult,
  validateAnswers,
  type AssessmentResult,
} from "@/lib/assessment";

const base = {
  q_stage: "stage_launched",
  q_avenue: "avenue_digital_products",
  q_goal: "goal_consistent",
  q_clarity: "clarity_offer",
  q_evidence: "evidence_engagement",
  q_time: "time_8_15",
  q_owned: "owned_product",
  q_support: "support_open",
};

function ok(answers: Record<string, string>): AssessmentResult {
  const r = buildResult(answers);
  if (!r.ok) throw new Error(`expected ok, missing=${r.missing} invalid=${r.invalid}`);
  return r.result;
}

describe("assessment definition", () => {
  it("has 8 questions with unique stable question and option IDs", () => {
    expect(ASSESSMENT_QUESTIONS).toHaveLength(8);
    const qIds = ASSESSMENT_QUESTIONS.map((q) => q.id);
    expect(new Set(qIds).size).toBe(qIds.length);
    const optIds = ASSESSMENT_QUESTIONS.flatMap((q) => q.options.map((o) => o.id));
    expect(new Set(optIds).size).toBe(optIds.length);
  });

  it("offers every requested avenue including unsure", () => {
    const avenue = ASSESSMENT_QUESTIONS.find((q) => q.id === "q_avenue")!;
    expect(avenue.options.map((o) => o.id)).toEqual([
      "avenue_digital_products",
      "avenue_quotes_faceless",
      "avenue_books_publishing",
      "avenue_asmr_visual",
      "avenue_ai_avatar",
      "avenue_brand_business",
      "avenue_tools_workflows",
      "avenue_unsure",
    ]);
  });
});

describe("validation of incomplete input", () => {
  it("rejects missing answers and names them", () => {
    const { q_time, ...rest } = base;
    void q_time;
    const r = buildResult(rest);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toEqual(["q_time"]);
  });

  it("rejects option IDs that belong to another question", () => {
    const r = validateAnswers({ ...base, q_time: "stage_selling" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.invalid).toEqual(["q_time"]);
  });

  it("rejects legacy v1 letter answers instead of reinterpreting them", () => {
    const r = buildResult({ 0: "A", 1: "B", 2: "C" });
    expect(r.ok).toBe(false);
  });

  it("rejects non-object input", () => {
    expect(buildResult(null).ok).toBe(false);
    expect(buildResult("x").ok).toBe(false);
    expect(buildResult([]).ok).toBe(false);
  });
});

describe("deterministic scoring", () => {
  it("is stamped with the current version", () => {
    expect(ok(base).version).toBe(ASSESSMENT_VERSION);
  });

  it("does not depend on answer key order", () => {
    const reversed = Object.fromEntries(Object.entries(base).reverse());
    expect(ok(reversed)).toEqual(ok(base));
  });

  it("a launched seller with engagement but uneven sales gets conversion first", () => {
    const r = ok(base);
    expect(r.priority).toBe("conversion");
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it("an explorer who is unsure of avenue gets direction and no purchase", () => {
    const r = ok({ ...base, q_stage: "stage_exploring", q_avenue: "avenue_unsure", q_goal: "goal_choose", q_clarity: "clarity_none", q_evidence: "evidence_none", q_owned: "owned_nothing" });
    expect(r.priority).toBe("direction");
    expect(r.avenue).toBeNull();
    expect(r.creatorPath).toBeNull();
    expect(r.resources).toEqual([]);
  });

  it("an experienced seller is not treated as a beginner", () => {
    const r = ok({ ...base, q_stage: "stage_selling", q_goal: "goal_audience", q_clarity: "clarity_clear", q_evidence: "evidence_sales", q_time: "time_15p", q_owned: "owned_audience" });
    expect(r.priority).toBe("growth");
  });

  it("flags 'selling' without sales evidence and takes the cautious read", () => {
    const r = ok({ ...base, q_stage: "stage_selling", q_evidence: "evidence_none", q_clarity: "clarity_clear", q_goal: "goal_audience" });
    expect(r.priority).toBe("validation");
    expect(r.notes.some((n) => n.includes("cautious"))).toBe(true);
  });
});

describe("ties", () => {
  it("resolves to the more foundational priority and reports the tie", () => {
    // starting(clarity1,validation1) + first_offer(clarity1,validation1) => clarity 2 = validation 2
    const r = ok({
      q_stage: "stage_starting",
      q_avenue: "avenue_books_publishing",
      q_goal: "goal_first_offer",
      q_clarity: "clarity_clear",
      q_evidence: "evidence_requests",
      q_time: "time_8_15",
      q_owned: "owned_nothing",
      q_support: "support_open",
    });
    expect(r.scores.clarity).toBe(r.scores.validation);
    expect(r.priority).toBe("clarity");
    expect(r.tiedWith).toContain("validation");
    expect(r.confidence).toBe("close");
    expect(r.notes.some((n) => n.includes("pointed equally"))).toBe(true);
  });
});

describe("spend preference", () => {
  it("free-only never shows resources and still gives an action and plan", () => {
    const r = ok({ ...base, q_support: "support_free" });
    expect(r.resources).toEqual([]);
    expect(r.immediateAction.length).toBeGreaterThan(20);
    expect(r.plan.steps).toHaveLength(3);
    expect(r.resourcesNote).toMatch(/free or already-owned/);
  });

  it("open-to-paid shows at most two optional resources", () => {
    const r = ok(base);
    expect(r.resources.length).toBeGreaterThan(0);
    expect(r.resources.length).toBeLessThanOrEqual(2);
  });
});

describe("exhaustive safety over every possible answer combination", () => {
  const lists = ASSESSMENT_QUESTIONS.map((q) => q.options.map((o) => o.id));
  const catalogById = new Map(CATALOG.map((e) => [e.id, e]));

  it("never recommends retired/excluded offers, never more than 2, never leads with a tool unless the priority is workflow", () => {
    let count = 0;
    const idx = lists.map(() => 0);
    for (;;) {
      const answers: Record<string, string> = {};
      ASSESSMENT_QUESTIONS.forEach((q, i) => (answers[q.id] = lists[i][idx[i]]));
      const r = ok(answers);
      count++;
      expect(r.resources.length).toBeLessThanOrEqual(2);
      for (const res of r.resources) {
        if (EXCLUDED_IDS.has(res.id)) throw new Error(`excluded ${res.id} recommended`);
        const entry = catalogById.get(res.id);
        if (!entry || !entry.matchable) throw new Error(`unmatchable ${res.id} recommended`);
        if (!res.url.startsWith("https://creatoraccesshub.diamonddigitaldiva.com/resources/")) throw new Error(res.url);
        if (res.url.includes("?")) throw new Error("query string in resource url");
      }
      if (r.resources[0]?.kind === "tool" && r.priority !== "systems") {
        throw new Error(`tool led for ${r.priority}: ${JSON.stringify(answers)}`);
      }
      if (r.spend === "free_only" && r.resources.length) throw new Error("free-only got resources");
      if (!r.avenue && r.resources.length) throw new Error("unsure avenue got resources");
      if (r.resources.some((x) => x.id === "the-offer-fix")) {
        const hasOffer =
          ["stage_launched", "stage_selling"].includes(answers.q_stage) ||
          answers.q_owned === "owned_product" ||
          answers.q_evidence === "evidence_sales";
        if (!hasOffer) throw new Error("the-offer-fix without an existing offer");
      }
      if (r.reasons.length === 0) throw new Error("no reasons");

      let k = idx.length - 1;
      while (k >= 0 && ++idx[k] === lists[k].length) { idx[k] = 0; k--; }
      if (k < 0) break;
    }
    expect(count).toBe(lists.reduce((n, l) => n * l.length, 1));
  }, 60_000);
});
