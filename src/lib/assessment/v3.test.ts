import { describe, it, expect } from "vitest";
import {
  MAP_V3_VERSION,
  V3_QUESTIONS,
  V3_LOCAL_ENTRIES,
  adaptCahFeed,
  V3_RETIRED_URLS,
  V3_OWNER_LINKS,
  OWNED_RESOURCES,
  buildResultV3,
  validateV3,
  pruneV3,
  toggleMulti,
  visibleV3Questions,
  getV3Question,
  v3Recommendability,
  resultSnapshotV3,
  legacyFieldsV3,
  CAH_BASE,
  MWYK_URL,
  DWA_URL,
  type V3Answers,
  type V3Result,
} from "@/lib/assessment/v3";
import { ASSESSMENT_QUESTIONS, RETIRED_URLS, buildResult as buildV2 } from "@/lib/assessment";
import { applyV3TextOverrides } from "@/lib/assessment/v3";
import { CAH_FEED_SNAPSHOT_2026_11_02 } from "../../../supabase/functions/_shared/map-v3/testdata/cahFeedSnapshot.ts";

// Recommendations come from the CAH feed; tests use a verbatim snapshot of it.
const LIVE = adaptCahFeed(CAH_FEED_SNAPSHOT_2026_11_02);
if (LIVE.status !== "live") throw new Error("feed snapshot did not validate");
const V3_CATALOG = [...V3_LOCAL_ENTRIES, ...LIVE.entries];

const comfortAll = (v: string) => ({
  cw_camera: v,
  cw_voice: v,
  cw_avatar: v,
  cw_faceless: v,
  cw_messages: v,
  cw_outreach: v,
});

const beginner: V3Answers = {
  m3_where: "where_new",
  m3_help: ["help_realistic"],
  m3_interests: ["int_publishing"],
  m3_bring: ["bring_skill"],
  m3_comfort: comfortAll("cmf_open"),
  m3_time: "time3_3_5",
  m3_device: "dev_windows",
  m3_budget: "budget_100",
  m3_support: ["sup_video"],
};

const seller: V3Answers = {
  m3_where: "where_inconsistent",
  m3_help: ["help_improve"],
  m3_interests: ["int_digital_products"],
  m3_bring: ["bring_knowledge", "bring_offer"],
  m3_working_on: ["work_products"],
  m3_obstacle: "obst_explain",
  m3_working: ["works_engage", "works_sales"],
  m3_comfort: comfortAll("cmf_open"),
  m3_time: "time3_6_10",
  m3_device: "dev_mac",
  m3_budget: "budget_300p",
  m3_support: ["sup_guide"],
};

function ok(a: V3Answers): V3Result {
  const r = buildResultV3(a, LIVE);
  if (!r.ok) throw new Error(`expected ok, missing=${r.missing} invalid=${r.invalid}`);
  return r.result;
}
const ids = (r: V3Result) => r.resources.map((x) => x.id);

describe("v3 definition", () => {
  it("is a new version with IDs that never reuse v2 question or option IDs", () => {
    expect(MAP_V3_VERSION).toBe("map-v3.0");
    const v2 = new Set(ASSESSMENT_QUESTIONS.flatMap((q) => [q.id, ...q.options.map((o) => o.id)]));
    const v3 = V3_QUESTIONS.flatMap((q) => [q.id, ...q.options.map((o) => o.id), ...(q.rows ?? []).map((r) => r.id)]);
    for (const id of v3) expect(v2.has(id)).toBe(false);
    const qIds = V3_QUESTIONS.map((q) => q.id);
    expect(new Set(qIds).size).toBe(qIds.length);
  });

  it("keeps the owner-approved wording", () => {
    expect(getV3Question("m3_where")!.options[0].label).toBe("I’m new and exploring how to get started.");
    expect(getV3Question("m3_interests")!.helper).toBe("Choose all that apply. You don’t need to decide yet.");
    expect(getV3Question("m3_interests")!.options).toHaveLength(12);
    expect(getV3Question("m3_support")!.maxSelections).toBe(2);
    expect(getV3Question("m3_owned")!.helper).toBe("Select any courses or tools you own, or type their names.");
    expect(getV3Question("m3_comfort")!.rows).toHaveLength(6);
  });

  it("offers all 34 shortlisted resources in the owned selector", () => {
    expect(OWNED_RESOURCES).toHaveLength(34);
    expect(new Set(OWNED_RESOURCES.map((r) => r.id)).size).toBe(34);
  });
});

describe("branching: new vs existing", () => {
  it("a learner never sees the working-on, obstacle or what's-working questions", () => {
    const shown = visibleV3Questions({ ...beginner, m3_where: "where_learning" }).map((q) => q.id);
    expect(shown).not.toContain("m3_working_on");
    expect(shown).not.toContain("m3_obstacle");
    expect(shown).not.toContain("m3_working");
    expect(shown).toHaveLength(11);
  });

  it("started creators see them, by stage or by bringing content or an offer", () => {
    for (const where of ["where_building", "where_inconsistent", "where_consistent", "where_redirect"]) {
      expect(visibleV3Questions({ m3_where: where }).map((q) => q.id)).toContain("m3_obstacle");
    }
    expect(visibleV3Questions({ m3_where: "where_new", m3_bring: ["bring_content"] }).map((q) => q.id)).toContain("m3_working");
    expect(visibleV3Questions({ m3_where: "where_new", m3_bring: ["bring_offer"] }).map((q) => q.id)).toContain("m3_obstacle");
  });

  it("the platform question appears only for the social interest", () => {
    expect(visibleV3Questions({ m3_interests: ["int_ai_avatar", "int_services"] }).map((q) => q.id)).not.toContain("m3_platforms");
    expect(visibleV3Questions({ m3_interests: ["int_social"] }).map((q) => q.id)).toContain("m3_platforms");
  });

  it("device detail only for several devices with a device-sensitive interest; Claude only where relevant", () => {
    const several = { ...beginner, m3_interests: ["int_ai_services"], m3_device: "dev_several" };
    expect(visibleV3Questions(several).map((q) => q.id)).toContain("m3_devices_available");
    expect(visibleV3Questions({ ...beginner, m3_device: "dev_several" }).map((q) => q.id)).not.toContain("m3_devices_available");
    expect(visibleV3Questions({ ...beginner, m3_interests: ["int_ai_services"], m3_device: "dev_phone" }).map((q) => q.id)).not.toContain("m3_claude");
    expect(visibleV3Questions({ ...beginner, m3_interests: ["int_ai_services"], m3_device: "dev_mac" }).map((q) => q.id)).toContain("m3_claude");
    expect(visibleV3Questions({ ...beginner, m3_device: "dev_mac" }).map((q) => q.id)).not.toContain("m3_claude");
  });

  it("going back and changing an earlier answer prunes now-hidden answers", () => {
    const a = pruneV3({ ...seller, m3_where: "where_new", m3_bring: ["bring_knowledge"] });
    expect(a.m3_working_on).toBeUndefined();
    expect(a.m3_obstacle).toBeUndefined();
    expect(a.m3_working).toBeUndefined();
    const b = pruneV3({ ...beginner, m3_interests: ["int_publishing"], m3_platforms: ["plat_other"], m3_platforms_other: "Substack" });
    expect(b.m3_platforms).toBeUndefined();
    expect(b.m3_platforms_other).toBeUndefined();
  });

  it("the server drops stale hidden answers instead of scoring them", () => {
    const v = validateV3({ ...beginner, m3_obstacle: "obst_convert", m3_working: ["works_sales"] });
    expect(v.ok).toBe(true);
    expect(v.answers!.m3_obstacle).toBeUndefined();
    expect(v.pruned).toEqual(["m3_obstacle", "m3_working"]);
  });
});

describe("multi-select rules", () => {
  const support = getV3Question("m3_support")!;
  it("support allows at most two choices", () => {
    let s: string[] = [];
    s = toggleMulti(support, s, "sup_guide");
    s = toggleMulti(support, s, "sup_video");
    expect(toggleMulti(support, s, "sup_live")).toBe(s);
    expect(validateV3({ ...beginner, m3_support: ["sup_guide", "sup_video", "sup_live"] }).ok).toBe(false);
  });

  it("exclusive unsure/none options clear contradictory selections", () => {
    expect(toggleMulti(support, ["sup_guide", "sup_video"], "sup_unsure")).toEqual(["sup_unsure"]);
    expect(toggleMulti(support, ["sup_unsure"], "sup_guide")).toEqual(["sup_guide"]);
    const owned = getV3Question("m3_owned")!;
    expect(toggleMulti(owned, ["res_cfw", "own_need_help"], "own_none")).toEqual(["own_none"]);
    expect(validateV3({ ...beginner, m3_bring: ["bring_skill", "bring_unsure"] }).ok).toBe(false);
  });
});

describe("validation of incomplete or malformed input", () => {
  it("requires visible conditional questions", () => {
    const { m3_obstacle, ...rest } = seller;
    void m3_obstacle;
    const r = buildResultV3(rest);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain("m3_obstacle");
  });

  it("requires every comfort row", () => {
    const r = validateV3({ ...beginner, m3_comfort: { cw_camera: "cmf_open" } });
    expect(r.ok).toBe(false);
    expect(r.invalid).toContain("m3_comfort");
  });

  it("rejects v2 answers, foreign option IDs and non-objects", () => {
    expect(buildResultV3({ q_stage: "stage_launched" }).ok).toBe(false);
    expect(validateV3({ ...beginner, m3_time: "stage_selling" }).ok).toBe(false);
    expect(buildResultV3(null).ok).toBe(false);
    expect(buildResultV3([]).ok).toBe(false);
  });

  it("bounds free text and never interprets it", () => {
    expect(validateV3({ ...beginner, m3_notes: "x".repeat(1001) }).ok).toBe(false);
    const withNote = ok({ ...beginner, m3_notes: "I want to sell coaching" });
    const without = ok(beginner);
    expect(withNote.primary).toEqual(without.primary);
    expect(withNote.resources).toEqual(without.resources);
    expect(withNote.userNoteAcknowledgement).toMatch(/only from your selected answers/);
  });

  it("v2 scoring still works for old records", () => {
    const r = buildV2({ q_stage: "stage_launched", q_avenue: "avenue_digital_products", q_goal: "goal_consistent", q_clarity: "clarity_offer", q_evidence: "evidence_engagement", q_time: "time_8_15", q_owned: "owned_product", q_support: "support_open" });
    expect(r.ok).toBe(true);
    expect(r.result!.version).toBe("map-v2.0");
  });
});

describe("results", () => {
  it("is deterministic regardless of key and selection order", () => {
    const reordered = Object.fromEntries(Object.entries({ ...seller, m3_bring: ["bring_offer", "bring_knowledge"] }).reverse());
    expect(ok(reordered)).toEqual(ok(seller));
  });

  it("a beginner gets a starting point, a next step and a plan without buying anything", () => {
    const r = ok({ ...beginner, m3_budget: "budget_free" });
    expect(r.tracks).toEqual(["start"]);
    expect(r.primary).toMatchObject({ kind: "path", id: "publishing", role: "start" });
    expect(r.primary.nextStep.length).toBeGreaterThan(40);
    expect(r.primary.plan).toHaveLength(3);
    expect(r.resources.every((x) => x.priceNote.startsWith("Free"))).toBe(true);
  });

  it("several interests are scored without forcing one, and ties are reported as uncertain", () => {
    const r = ok({ ...beginner, m3_interests: ["int_publishing", "int_digital_products"], m3_bring: ["bring_skill"] });
    expect(r.uncertain).toBe(true);
    expect(r.notes.some((n) => n.includes("equally"))).toBe(true);
    expect([r.primary.id, r.alternate?.id].sort()).toEqual(["digital_products", "publishing"]);
  });

  it("assets break ties honestly: knowledge favours digital products", () => {
    const r = ok({ ...beginner, m3_interests: ["int_publishing", "int_digital_products", "int_quotes"], m3_bring: ["bring_knowledge"], m3_comfort: { ...comfortAll("cmf_open"), cw_faceless: "cmf_avoid" } });
    expect(r.primary.id).toBe("digital_products");
  });

  it("an existing seller can get improvement AND expansion", () => {
    const r = ok({ ...seller, m3_help: ["help_improve", "help_add_stream"], m3_interests: ["int_digital_products", "int_publishing"] });
    expect(r.tracks).toEqual(["improve", "expand"]);
    expect(r.primary).toMatchObject({ kind: "gap", id: "message", role: "improve" });
    expect(r.alternate).toMatchObject({ kind: "path", id: "publishing", role: "expand" });
  });

  it("someone only wanting a new stream gets expansion first", () => {
    const r = ok({ ...seller, m3_where: "where_consistent", m3_help: ["help_add_stream"], m3_interests: ["int_digital_products", "int_publishing"] });
    expect(r.primary).toMatchObject({ kind: "path", id: "publishing", role: "expand" });
    expect(r.alternate?.kind).toBe("gap");
  });

  it("a pivot gets a new direction, not the one they're leaving", () => {
    const r = ok({ ...seller, m3_where: "where_redirect", m3_interests: ["int_digital_products", "int_services"], m3_working_on: ["work_products"], m3_claude: "claude_no" });
    expect(r.primary).toMatchObject({ kind: "path", id: "services", role: "pivot" });
  });

  it("'not sure what the problem is' infers from what's working, or says so", () => {
    expect(ok({ ...seller, m3_obstacle: "obst_unsure", m3_working: ["works_engage"], m3_where: "where_building" }).primary.id).toBe("conversion");
    expect(ok({ ...seller, m3_obstacle: "obst_unsure", m3_working: ["works_early"], m3_where: "where_building" }).primary.id).toBe("launch");
    const d = ok({ ...seller, m3_obstacle: "obst_unsure", m3_working: ["works_sales", "works_routine"] });
    expect(d.primary.id).toBe("diagnose");
    expect(d.uncertain).toBe(true);
  });

  it("someone unsure what fits gets a useful discover result, the free community and the Decision Point note (no link)", () => {
    const r = ok({ ...beginner, m3_interests: ["int_discover"], m3_bring: ["bring_unsure"] });
    expect(r.primary.kind).toBe("discover");
    expect(r.primary.nextStep.length).toBeGreaterThan(40);
    expect(ids(r)).toEqual(["monetize-what-you-know"]);
    expect(r.resources[0].url).toBe(MWYK_URL);
    expect(r.decisionPoint).toMatch(/waitlist/);
    expect(JSON.stringify(r)).not.toMatch(/decision-?point\.|the-decision-point/);
  });

  it("an audience alone is never treated as owning an offer", () => {
    const base = { ...seller, m3_bring: ["bring_content"], m3_where: "where_building", m3_working: ["works_engage"] };
    const conv = ok({ ...base, m3_obstacle: "obst_convert" });
    expect(ids(conv)).not.toContain("tss");
    expect(conv.excluded.some((x) => x.id === "tss" && x.reason === "nothing-to-sell")).toBe(true);
    const launch = ok({ ...base, m3_obstacle: "obst_launch" });
    expect(ids(launch)).not.toContain("faceless-launch");
    expect(launch.excluded.some((x) => x.id === "faceless-launch" && x.reason === "no-offer")).toBe(true);
  });

  it("existing digital-product sellers with a message gap get an evidenced fit, never The Offer Fix (title-only scope)", () => {
    const r = ok(seller);
    expect(ids(r)[0]).toBe("faceless-launch");
    expect(ids(r)).not.toContain("the-offer-fix");
  });
});

describe("social vs non-social", () => {
  it("no-social preference with social interest is clarified, not contradicted", () => {
    const r = ok({ ...beginner, m3_interests: ["int_social", "int_no_social"], m3_platforms: ["plat_pinterest"] });
    expect(r.primary.id).toBe("social");
    expect(r.notes.some((n) => n.includes("Pinterest and YouTube work more like search"))).toBe(true);
  });

  it("no-social favours publishing and services over nothing else", () => {
    const r = ok({ ...beginner, m3_interests: ["int_affiliate", "int_publishing", "int_no_social"], m3_bring: ["bring_purchased"] });
    expect(r.primary.id).toBe("publishing");
  });

  it("services never require social media (Paid with AI states it)", () => {
    const r = ok({ ...beginner, m3_interests: ["int_ai_services"], m3_device: "dev_windows", m3_claude: "claude_yes", m3_budget: "budget_300p" });
    expect(ids(r)).toContain("paid-with-ai");
    expect(r.resources[0].summary).toMatch(/doesn't require a social media audience/);
  });
});

describe("device and plan prerequisites", () => {
  const aiSvc = { ...beginner, m3_interests: ["int_ai_services"], m3_budget: "budget_300p" };

  it("phone-only respondents never get a computer-only workflow", () => {
    const r = ok({ ...aiSvc, m3_device: "dev_phone" });
    expect(ids(r)).not.toContain("paid-with-ai");
    expect(r.considerations.some((c) => c.includes("phone or tablet"))).toBe(true);
  });

  it("Chromebook excludes Paid with AI and Powerhorse", () => {
    const r = ok({ ...aiSvc, m3_device: "dev_chromebook" });
    expect(ids(r)).not.toContain("paid-with-ai");
    const b = ok({ ...seller, m3_device: "dev_chromebook", m3_interests: ["int_business"], m3_working_on: ["work_business"], m3_obstacle: "obst_convert" });
    expect(ids(b)).not.toContain("powerhorse-academy");
    expect(b.considerations.some((c) => c.includes("Chromebook"))).toBe(true);
  });

  it("several devices: only the platforms they list count, never an assumed desktop", () => {
    const yes = ok({ ...aiSvc, m3_device: "dev_several", m3_devices_available: ["devp_phone", "devp_windows"], m3_claude: "claude_yes" });
    expect(ids(yes)).toContain("paid-with-ai");
    const no = ok({ ...aiSvc, m3_device: "dev_several", m3_devices_available: ["devp_phone", "devp_chromebook"] });
    expect(ids(no)).not.toContain("paid-with-ai");
  });

  it("no paid Claude plan excludes it; willing shows the requirement clearly", () => {
    const no = ok({ ...aiSvc, m3_device: "dev_mac", m3_claude: "claude_no" });
    expect(ids(no)).not.toContain("paid-with-ai");
    expect(no.considerations.some((c) => c.includes("paid Claude plan"))).toBe(true);
    const maybe = ok({ ...aiSvc, m3_device: "dev_mac", m3_claude: "claude_consider" });
    const pwa = maybe.resources.find((x) => x.id === "paid-with-ai")!;
    expect(pwa.requirementNote).toMatch(/Claude Pro/);
    expect(pwa.requirementNote).toMatch(/consider/);
  });

  it("preferring to avoid outreach excludes the outreach route", () => {
    const r = ok({ ...aiSvc, m3_device: "dev_mac", m3_claude: "claude_yes", m3_comfort: { ...comfortAll("cmf_open"), cw_outreach: "cmf_avoid" } });
    expect(ids(r)).not.toContain("paid-with-ai");
  });
});

describe("ownership, budget and catalog safety", () => {
  it("never recommends something they already own, and points to it instead", () => {
    const r = ok({ ...seller, m3_owned: ["res_faceless_launch_formula"] });
    expect(ids(r)).not.toContain("faceless-launch");
    expect(r.ownedFits).toContain("Faceless Launch Formula");
    expect(r.considerations.some((c) => c.includes("already own"))).toBe(true);
  });

  it("typed names only match exactly ('Monetize It' is not 'Monetize What You Know')", () => {
    const exact = ok({ ...seller, m3_owned_other: "faceless launch formula" });
    expect(ids(exact)).not.toContain("faceless-launch");
    const fuzzy = ok({ ...beginner, m3_interests: ["int_discover"], m3_owned_other: "Monetize It, offer fixing course" });
    expect(ids(fuzzy)).toContain("monetize-what-you-know");
    expect(fuzzy.considerations.some((c) => c.includes("exact names"))).toBe(true);
  });

  it("free-only shows no paid items even though prices are unknown", () => {
    const r = ok({ ...seller, m3_budget: "budget_free" });
    expect(r.resources.every((x) => x.priceNote.startsWith("Free"))).toBe(true);
    expect(r.resourcesNote).toMatch(/free resources and what you already own/);
  });

  it("a capped budget only takes free items or verified prices within the cap", () => {
    const r = ok({ ...seller, m3_budget: "budget_50" });
    expect(ids(r)).toContain("selling-made-simple"); // verified $37
    expect(ids(r)).not.toContain("faceless-launch"); // verified $77
    expect(r.excluded.some((x) => x.id === "faceless-launch" && x.reason === "over-budget")).toBe(true);
    expect(r.excluded.some((x) => x.id === "tss" && x.reason === "price-unverified")).toBe(true);
    for (const x of r.resources) expect(x.priceNote).toMatch(/^(Free|About \$\d+ )/);
    expect(r.considerations.some((c) => c.includes("couldn't confirm their current price"))).toBe(true);
  });

  describe("budget $50 with DWA price states", () => {
    const start = { ...beginner, m3_interests: ["int_digital_products"], m3_bring: ["bring_knowledge"], m3_budget: "budget_50" };
    const withDwa = (price: unknown) => V3_CATALOG.map((e) => (e.id === "dwa" ? { ...e, price } : e));
    it("unverified DWA is excluded (price-unverified), with a clear note", () => {
      const r = buildResultV3(start, withDwa({ state: "unverified" })).result!;
      expect(ids(r)).not.toContain("dwa");
      expect(r.excluded).toContainEqual({ id: "dwa", reason: "price-unverified" });
      expect(r.considerations.some((c) => c.includes("couldn't confirm their current price"))).toBe(true);
      const only = buildResultV3(start, withDwa({ state: "unverified" }).filter((e) => e.id === "dwa")).result!;
      expect(only.resources).toEqual([]);
      expect(only.resourcesNote).toMatch(/couldn't confirm their current prices/);
    });
    it("verified $497 is excluded", () => {
      const r = ok(start);
      expect(ids(r)).not.toContain("dwa");
      expect(r.excluded).toContainEqual({ id: "dwa", reason: "over-budget" });
    });
    it("verified $37 is included", () => {
      const r = buildResultV3(start, withDwa({ state: "verified", usd: 37, checkedAt: "2026-11-01", source: "test" })).result!;
      expect(ids(r)).toContain("dwa");
    });
    it("free items are included", () => {
      const r = buildResultV3(start, withDwa({ state: "free-owner-stated" })).result!;
      expect(ids(r)).toContain("dwa");
      expect(ok({ ...start, m3_interests: ["int_discover"] }).resources.map((x) => x.id)).toContain("monetize-what-you-know");
    });
  });

  it("'unsure' budget shows options without assuming they're ready to buy", () => {
    const r = ok({ ...seller, m3_budget: "budget_unsure" });
    expect(r.resourcesNote).toMatch(/comparison only/);
    expect(r.resources.some((x) => x.priceNote.startsWith("Price not confirmed")) || ids(r).length > 0).toBe(true);
  });

  it("pending, unscoped, being-updated or unlinked products are never recommendable", () => {
    const reason = (id: string) => {
      const r = v3Recommendability(V3_CATALOG.find((x) => x.id === id)!);
      return r.ok ? "ok" : r.reason;
    };
    expect(reason("insta-expand")).toBe("status-not-active");
    expect(reason("quote-society")).toBe("status-not-active");
    expect(reason("the-decision-point")).toBe("status-not-active");
    // Known scope, missing destination only:
    expect(reason("passive-by-design")).toBe("no-destination");
    expect(reason("pin-prompt-profit")).toBe("no-destination");
    expect(reason("ata")).toBe("no-destination");
    expect(reason("the-offer-fix")).toBe("scope-not-established");
    for (const id of ["aifluencer-studio", "faceless-launch", "daily-sales-rhythm", "100k-threads-challenge", "0-first-sale-challenge", "ai-to-sales", "selling-made-simple", "the-molly-x-rosie-archive", "prompt-to-sales", "ai-podcast-kit-10-min-workflow-x-chatbots-x-100-viral-quot"]) {
      const e = V3_CATALOG.find((x) => x.id === id)!;
      expect(reason(id)).toBe("ok");
      expect(e.destination!.url).toBe(`${CAH_BASE}/resources/${id}`);
    }
    const ata = V3_CATALOG.find((x) => x.id === "ata")!;
    expect(ata.status).toBe("active");
    expect(ata.retiredUrls).toContain(`${CAH_BASE}/resources/ata`);
  });

  it("DWA stays an active candidate via its owner link, never the retired CAH page", () => {
    const dwa = V3_CATALOG.find((e) => e.id === "dwa")!;
    expect(dwa.status).toBe("active");
    expect(v3Recommendability(dwa).ok).toBe(true);
    expect(dwa.destination!.url).toBe(DWA_URL);
    expect(dwa.fits.paths).toEqual(["digital_products", "affiliate"]);
    const r = ok({ ...beginner, m3_interests: ["int_digital_products"], m3_bring: ["bring_knowledge"], m3_budget: "budget_300p" });
    expect(r.resources.find((x) => x.id === "dwa")?.url).toBe(DWA_URL);
  });

  it("retired list matches v2 and a supplied catalog can't re-enable blocked items", () => {
    expect([...V3_RETIRED_URLS].sort()).toEqual([...RETIRED_URLS].sort());
    const smuggled = V3_CATALOG.map((e) =>
      e.id === "insta-expand"
        ? { ...e, status: "active" as const, matchable: true, destination: { ...V3_CATALOG[1].destination!, url: `${CAH_BASE}/resources/insta-expand` }, fits: { paths: ["social" as const], gaps: [] } }
        : e
    );
    const r = buildResultV3({ ...beginner, m3_interests: ["int_social"], m3_platforms: ["plat_instagram"] }, smuggled);
    expect(r.result!.resources.map((x) => x.id)).not.toContain("insta-expand");
  });

  it("an unusable catalog still gives a full free result", () => {
    const r = buildResultV3(seller, "not-a-list");
    expect(r.ok).toBe(true);
    expect(r.result!.resources).toEqual([]);
    expect(r.result!.catalogFallback).toBe(true);
    expect(r.result!.primary.nextStep).toBeTruthy();
  });
});

describe("exhaustive safety over core answer combinations", () => {
  it("never more than 2 resources, no retired or unapproved links, no personal data, prerequisites respected", () => {
    const wheres = getV3Question("m3_where")!.options.map((o) => o.id);
    const interestSets = [["int_discover"], ["int_ai_services"], ["int_services", "int_no_social"], ["int_digital_products", "int_publishing"], ["int_business"], ["int_quotes", "int_ai_avatar"], ["int_social", "int_affiliate"], ["int_asmr"]];
    const obstacles = getV3Question("m3_obstacle")!.options.map((o) => o.id);
    const devices = ["dev_phone", "dev_chromebook", "dev_mac"];
    const budgets = ["budget_free", "budget_50", "budget_unsure"];
    const comforts = [comfortAll("cmf_open"), comfortAll("cmf_avoid")];
    let n = 0;
    for (const where of wheres)
      for (const ints of interestSets)
        for (const obst of obstacles)
          for (const dev of devices)
            for (const budget of budgets)
              for (const comfort of comforts) {
                const a: V3Answers = pruneV3({
                  m3_where: where,
                  m3_help: ["help_improve", "help_add_stream"],
                  m3_interests: ints,
                  m3_platforms: ["plat_instagram"],
                  m3_bring: ["bring_knowledge"],
                  m3_working_on: ["work_products"],
                  m3_obstacle: obst,
                  m3_working: ["works_engage"],
                  m3_comfort: comfort,
                  m3_time: "time3_lt3",
                  m3_device: dev,
                  m3_claude: "claude_yes",
                  m3_budget: budget,
                  m3_support: ["sup_community"],
                });
                const r = ok(a);
                n++;
                expect(r.resources.length).toBeLessThanOrEqual(2);
                expect(r.primary.nextStep.length).toBeGreaterThan(20);
                for (const x of r.resources) {
                  expect(V3_RETIRED_URLS.has(x.url)).toBe(false);
                  const isCah = x.url.startsWith(`${CAH_BASE}/resources/`) && !x.url.includes("?");
                  expect(isCah || V3_OWNER_LINKS.has(x.url)).toBe(true);
                  if (budget === "budget_free") expect(x.priceNote.startsWith("Free")).toBe(true);
                  if (dev !== "dev_mac") expect(["paid-with-ai", "powerhorse-academy"]).not.toContain(x.id);
                  if (budget === "budget_50") expect(x.priceNote).toMatch(/^(Free|About \$(\d|[1-4]\d|50) )/);
                }
                if (r.resources[0]?.kind === "tool") {
                  expect(r.primary.kind === "gap" && ["content", "systems"].includes(r.primary.id)).toBe(true);
                }
                const snap = JSON.stringify(resultSnapshotV3(r));
                expect(snap.length).toBeLessThan(6000);
                expect(legacyFieldsV3(r).primaryStage.length).toBeLessThanOrEqual(100);
                expect(r.primary.id.length).toBeLessThanOrEqual(20);
              }
    expect(n).toBeGreaterThan(1000);
  }, 60_000);
});

describe("owner-supplied profiles: platform, avatar and bundle rules", () => {
  const social = { ...beginner, m3_interests: ["int_social"], m3_budget: "budget_50" };
  it("100K Threads Challenge only for people who chose Threads", () => {
    expect(ids(ok({ ...social, m3_platforms: ["plat_threads"] }))).toContain("100k-threads-challenge");
    const ig = ok({ ...social, m3_platforms: ["plat_instagram"] });
    expect(ids(ig)).not.toContain("100k-threads-challenge");
    expect(ig.excluded).toContainEqual({ id: "100k-threads-challenge", reason: "platform-mismatch" });
  });

  it("Secret Sauce (Instagram Stories) isn't suggested to a Threads-only respondent", () => {
    const r = ok({ ...seller, m3_interests: ["int_social", "int_digital_products"], m3_platforms: ["plat_threads"], m3_obstacle: "obst_convert" });
    expect(ids(r)).not.toContain("tss");
    expect(r.excluded).toContainEqual({ id: "tss", reason: "platform-mismatch" });
  });

  it("AI to Sales needs an existing avatar; Prompt to Sales is never suggested to Secret Sauce owners", () => {
    const avatarSeller = { ...seller, m3_interests: ["int_ai_avatar"], m3_working_on: ["work_ai"], m3_obstacle: "obst_content" };
    expect(ids(ok({ ...avatarSeller, m3_obstacle: "obst_convert" }))).toContain("ai-to-sales");
    const noAvatar = ok({ ...avatarSeller, m3_working_on: ["work_products"], m3_interests: ["int_ai_avatar", "int_digital_products"], m3_obstacle: "obst_convert" });
    expect(ids(noAvatar)).not.toContain("ai-to-sales");
    const owner = ok({ ...avatarSeller, m3_owned: ["res_secret_sauce"] });
    expect(owner.excluded).toContainEqual({ id: "prompt-to-sales", reason: "included-in-owned" });
  });

  it("a prompt bank is never the first suggestion unless the need is tools, systems or content", () => {
    const avatarStart = { ...beginner, m3_interests: ["int_ai_avatar"], m3_budget: "budget_50" };
    expect(ok(avatarStart).resources[0]?.kind).not.toBe("tool");
    expect(ids(ok({ ...avatarStart, m3_support: ["sup_tools"] }))[0]).toBe("the-molly-x-rosie-archive");
  });

  it("avoiding AI avatars excludes avatar-creation programs", () => {
    const r = ok({ ...beginner, m3_interests: ["int_ai_avatar"], m3_budget: "budget_300p", m3_comfort: { ...comfortAll("cmf_open"), cw_avatar: "cmf_avoid" } });
    expect(ids(r)).not.toContain("aica");
    expect(ids(r)).not.toContain("aifluencer-studio");
  });

  it("discounts aren't relied on: AICA and CFW use their regular prices for budget checks", () => {
    const aica = V3_CATALOG.find((e) => e.id === "aica")!;
    const cfw = V3_CATALOG.find((e) => e.id === "cfw")!;
    expect(aica.price).toMatchObject({ state: "verified", usd: 247 });
    expect(cfw.price).toMatchObject({ state: "verified", usd: 487 });
    expect(ids(ok({ ...beginner, m3_interests: ["int_ai_avatar"], m3_budget: "budget_200" }))).not.toContain("aica");
  });

  it("$0 First Sale is not treated as free and is only for people without sales", () => {
    const e = V3_CATALOG.find((x) => x.id === "0-first-sale-challenge")!;
    expect(e.price).toMatchObject({ state: "verified", usd: 15 });
    const free = ok({ ...beginner, m3_interests: ["int_affiliate"], m3_budget: "budget_free" });
    expect(ids(free)).not.toContain("0-first-sale-challenge");
  });
});

describe("admin wording overrides for v3", () => {
  it("changes wording only, ignores other versions and keeps conditions", () => {
    const out = applyV3TextOverrides(
      V3_QUESTIONS,
      [
        { assessment_version: "map-v3.0", item_key: "m3_where", text: "Where are you today?" },
        { assessment_version: "map-v3.0", item_key: "m3_comfort.cw_camera", text: "Being on camera." },
        { assessment_version: "map-v3.0", item_key: "m3_owned.res_cfw", text: "Hacked" },
        { assessment_version: "map-v2.0", item_key: "m3_time", text: "nope" },
      ],
      "map-v3.0"
    );
    expect(out[0].text).toBe("Where are you today?");
    expect(out.find((q) => q.id === "m3_comfort")!.rows![0].label).toBe("Being on camera.");
    expect(out.find((q) => q.id === "m3_owned")!.options.find((o) => o.id === "res_cfw")!.label).toBe("CFW");
    expect(out.find((q) => q.id === "m3_time")!.text).toBe(getV3Question("m3_time")!.text);
    expect(out.find((q) => q.id === "m3_obstacle")!.showIf).toBe(getV3Question("m3_obstacle")!.showIf);
  });
});
