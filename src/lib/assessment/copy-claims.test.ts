import { describe, it, expect } from "vitest";
import { AFFILIATE_DISCLOSURE, MARKETING_CONSENT_TEXT, V3_LOCAL_ENTRIES, adaptCahFeed } from "@/lib/assessment/v3";
import { CAH_FEED_SNAPSHOT_2026_11_02 } from "../../../supabase/functions/_shared/map-v3/testdata/cahFeedSnapshot.ts";
import feedSrc from "../../../supabase/functions/_shared/map-v3/feed.ts?raw";

// Product copy now comes from the CAH feed; checked here on today's verbatim snapshot.
const LIVE = adaptCahFeed(CAH_FEED_SNAPSHOT_2026_11_02);
const V3_CATALOG = [...V3_LOCAL_ENTRIES, ...(LIVE.status === "live" ? LIVE.entries : [])];
import engineSrc from "../../../supabase/functions/_shared/map-v3/engine.ts?raw";
import definitionSrc from "../../../supabase/functions/_shared/map-v3/definition.ts?raw";
import catalogSrc from "../../../supabase/functions/_shared/map-v3/catalog.ts?raw";
import introSrc from "@/components/quiz/IntroScreen.tsx?raw";
import leadSrc from "@/components/quiz/LeadScreen.tsx?raw";
import resultSrc from "@/components/quiz/ResultScreen.tsx?raw";

const SOURCES: Record<string, string> = {
  "supabase/functions/_shared/map-v3/engine.ts": engineSrc,
  "supabase/functions/_shared/map-v3/definition.ts": definitionSrc,
  "supabase/functions/_shared/map-v3/catalog.ts": catalogSrc,
  "supabase/functions/_shared/map-v3/feed.ts": feedSrc,
  "src/components/quiz/IntroScreen.tsx": introSrc,
  "src/components/quiz/LeadScreen.tsx": leadSrc,
  "src/components/quiz/ResultScreen.tsx": resultSrc,
};
const read = (p: string) => {
  const src = SOURCES[p];
  if (!src || src.length < 200) throw new Error(`source not loaded: ${p}`);
  return src;
};

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
    expect(V3_CATALOG.length).toBeGreaterThan(10);
    // feed.ts holds a promise-blocking pattern itself, so its displayed notes are checked here instead.
    expect(feedSrc).toContain("PREREQ_NOTE");
    for (const e of V3_CATALOG) {
      expect(e.requirementNote ?? "", e.id).not.toMatch(PROMISE);
      expect(e.summary, e.id).not.toMatch(/income|profit|earnings|views|guarantee|results vary/i);
    }
  });

  it("titles that contain a number or money word are kept exactly, and their summaries say it's just the title", () => {
    const byId = Object.fromEntries(V3_CATALOG.map((e) => [e.id, e]));
    expect(byId["100k-threads-challenge"].name).toBe("100K Threads Challenge");
    expect(byId["100k-threads-challenge"].summary).toMatch(/part of the product title, not a promised result/);
    // CAH's exact title; only the decorative emoji is removed.
    expect(byId["0-first-sale-challenge"].name).toBe("$0 → FIRST SALE CHALLENGE");
    expect(byId["0-first-sale-challenge"].summary).toMatch(/title, not a price or a promised result/);
    expect(byId["dwa"].name).toBe("Digital Wealth Academy 4.0");
  });

  it("the result page keeps the guidance line", () => {
    expect(read("src/components/quiz/ResultScreen.tsx")).toContain("Results are guidance, not a promise of income.");
  });
});

describe("affiliate links and consent wording", () => {
  it("affiliate status comes only from the CAH feed's own flag; MAP's free community is never flagged", () => {
    const snapItems = CAH_FEED_SNAPSHOT_2026_11_02.items as readonly { id: string; affiliate: boolean }[];
    for (const e of V3_CATALOG.filter((x) => x.id !== "monetize-what-you-know")) {
      expect(e.affiliate === true, e.id).toBe(snapItems.find((i) => i.id === e.id)!.affiliate);
    }
    expect(V3_CATALOG.find((e) => e.id === "monetize-what-you-know")?.affiliate).toBeUndefined();
    // A feed item marked not-affiliate stays unflagged.
    const notAff = adaptCahFeed({
      ...CAH_FEED_SNAPSHOT_2026_11_02,
      items: CAH_FEED_SNAPSHOT_2026_11_02.items.map((i) => (i.id === "aica" ? { ...i, affiliate: false } : i)),
    });
    expect(notAff.status === "live" && notAff.entries.find((e) => e.id === "aica")!.affiliate).toBeUndefined();
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
