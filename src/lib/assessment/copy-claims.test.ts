import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { V3_CATALOG, AFFILIATE_DISCLOSURE, MARKETING_CONSENT_TEXT } from "@/lib/assessment/v3";

const read = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf8");

// Authored copy that people see: results engine, questions, catalog, intro, lead and result screens.
const AUTHORED = [
  "supabase/functions/_shared/map-v3/engine.ts",
  "supabase/functions/_shared/map-v3/definition.ts",
  "supabase/functions/_shared/map-v3/catalog.ts",
  "src/components/quiz/IntroScreen.tsx",
  "src/components/quiz/LeadScreen.tsx",
  "src/components/quiz/ResultScreen.tsx",
];

const PROMISE =
  /guarantee|you(?:'ll| will) (?:earn|make|get|see)|make \$\d|earn \$\d|\$\d[\d,]*\s*(?:\/|a |per )(?:day|week|month)|quit your job|overnight|get rich|six[- ]figure|passive income|proven (?:to|system)|results in \d+ days|in \d+ days you/i;

describe("no results, income, views or profit promises in authored copy", () => {
  for (const file of AUTHORED) {
    it(file, () => {
      expect(read(file)).not.toMatch(PROMISE);
    });
  }

  it("catalog summaries describe the training, not an outcome", () => {
    for (const e of V3_CATALOG) {
      expect(e.summary, e.id).not.toMatch(/income|profit|earnings|views|guarantee|results vary/i);
    }
  });

  it("titles that contain a number or money word are kept exactly, and their summaries say it's just the title", () => {
    const byId = Object.fromEntries(V3_CATALOG.map((e) => [e.id, e]));
    expect(byId["100k-threads-challenge"].name).toBe("100K Threads Challenge");
    expect(byId["100k-threads-challenge"].summary).toMatch(/part of the product title, not a promised result/);
    expect(byId["0-first-sale-challenge"].name).toBe("$0 - First Sale Challenge");
    expect(byId["0-first-sale-challenge"].summary).toMatch(/title, not a price or a promised result/);
    expect(byId["dwa"].name).toBe("Digital Wealth Academy 4.0");
  });

  it("the result page keeps the guidance line", () => {
    expect(read("src/components/quiz/ResultScreen.tsx")).toContain("Results are guidance, not a promise of income.");
  });
});

describe("affiliate links and consent wording", () => {
  it("only evidenced affiliate links are flagged (owner-provided URL with the owner's affiliate ID)", () => {
    const flagged = V3_CATALOG.filter((e) => e.affiliate).map((e) => e.id);
    expect(flagged).toEqual(["dwa"]);
    for (const e of V3_CATALOG.filter((x) => x.affiliate)) {
      expect(e.destination?.kind).toBe("owner-provided");
      expect(e.destination?.url).toMatch(/[?&]affiliate=/);
    }
    expect(V3_CATALOG.find((e) => e.id === "monetize-what-you-know")?.affiliate).toBeUndefined();
  });

  it("disclosure and consent text are the owner's exact wording", () => {
    expect(AFFILIATE_DISCLOSURE).toBe(
      "Some links below are affiliate links. If you purchase through them, I may earn a commission at no additional cost to you."
    );
    expect(MARKETING_CONSENT_TEXT).toBe(
      "Yes, you may email me helpful resources, product updates and offers from Diamond Digital Diva. I can unsubscribe at any time."
    );
  });
});
