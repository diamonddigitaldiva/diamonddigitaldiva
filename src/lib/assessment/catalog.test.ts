import { describe, it, expect } from "vitest";
import {
  CATALOG,
  CATALOG_EXCLUSIONS,
  CATALOG_LAST_REVIEWED,
  CREATOR_PATHS,
  EXCLUDED_IDS,
  buildResult,
  creatorPathFor,
  matchResources,
  resourceUrl,
  validateCatalog,
} from "@/lib/assessment";

const ARCHIVED = ["ata", "dwa", "mpv", "tacm", "story-algorithm", "foc", "create-launch-sell"];

describe("CAH catalog adapter", () => {
  it("records a last-reviewed date", () => {
    expect(CATALOG_LAST_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("excludes every archived CAH ID", () => {
    for (const id of ARCHIVED) {
      expect(EXCLUDED_IDS.has(id)).toBe(true);
      expect(CATALOG.some((e) => e.id === id)).toBe(false);
    }
  });

  it("excludes CPM / Anti-Clone Decoder and products that are being updated or coming soon", () => {
    for (const id of ["cpm", "anti-clone-decoder", "the-map", "the-decision-point", "studio-velora"]) {
      expect(EXCLUDED_IDS.has(id)).toBe(true);
    }
    expect(CATALOG_EXCLUSIONS.find((e) => e.id === "studio-velora")?.reason).toBe("coming-soon");
  });

  it("builds canonical CAH resource and creator-path URLs with no query strings", () => {
    expect(resourceUrl("the-offer-fix")).toBe(
      "https://creatoraccesshub.diamonddigitaldiva.com/resources/the-offer-fix"
    );
    expect(creatorPathFor("books_publishing")?.url).toBe(
      "https://creatoraccesshub.diamonddigitaldiva.com/creator-paths/books-publishing"
    );
    expect(creatorPathFor(null)).toBeNull();
    for (const p of CREATOR_PATHS) expect(p.slug).not.toMatch(/[?#]/);
  });

  it("does not auto-recommend entries with unestablished scope", () => {
    expect(CATALOG.find((e) => e.id === "workflow-hub")?.matchable).toBe(false);
    expect(CATALOG.find((e) => e.id === "aifluencer-studio")?.matchable).toBe(false);
  });

  it("validateCatalog drops excluded, malformed and duplicate entries", () => {
    const { valid, issues } = validateCatalog([
      CATALOG[0],
      CATALOG[0],
      { id: "foc", name: "FOC", status: "active", summary: "", avenues: [], stages: [], priorities: [] },
      { id: "BAD ID" },
      null,
    ]);
    expect(valid.map((e) => e.id)).toEqual([CATALOG[0].id]);
    expect(issues.length).toBe(4);
  });
});

describe("catalog failure fallback", () => {
  const answers = {
    q_stage: "stage_launched",
    q_avenue: "avenue_digital_products",
    q_goal: "goal_consistent",
    q_clarity: "clarity_offer",
    q_evidence: "evidence_engagement",
    q_time: "time_8_15",
    q_owned: "owned_product",
    q_support: "support_open",
  };

  it("an unusable catalog yields no resources but a full plan", () => {
    const r = buildResult(answers, "not-a-list");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.result.resources).toEqual([]);
      expect(r.result.immediateAction).toBeTruthy();
      expect(r.result.plan.steps).toHaveLength(3);
      expect(r.result.creatorPath?.slug).toBe("digital-income");
    }
  });

  it("a catalog that throws is caught and reported as a fallback", () => {
    const exploding = [
      {
        ...CATALOG[0],
        eligible: () => {
          throw new Error("boom");
        },
      },
    ];
    const m = matchResources(
      { priority: "conversion", secondaryPriority: null, avenue: "digital_products", stage: "launched", hasOffer: true, hasSales: false },
      exploding
    );
    expect(m).toEqual({ resources: [], catalogError: true });

    const r = buildResult(answers, exploding);
    expect(r.ok && r.result.catalogFallback).toBe(true);
    expect(r.ok && r.result.resourcesNote).toMatch(/couldn't load/);
  });

  it("an excluded ID smuggled into a catalog is never returned", () => {
    const smuggled = [{ ...CATALOG[0], id: "foc" }];
    const m = matchResources(
      { priority: "conversion", secondaryPriority: null, avenue: "digital_products", stage: "launched", hasOffer: true, hasSales: false },
      smuggled
    );
    expect(m.resources).toEqual([]);
  });
});
