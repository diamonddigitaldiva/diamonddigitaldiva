import { describe, it, expect } from "vitest";
import {
  CATALOG,
  CATALOG_LAST_REVIEWED,
  CREATOR_PATHS,
  DWA_OWNER_LINK,
  NOT_RECOMMENDABLE_IDS,
  OWNER_APPROVED_LINKS,
  RETIRED_URLS,
  buildResult,
  creatorPathFor,
  matchResources,
  recommendability,
  resourceUrl,
  validateCatalog,
  type CatalogEntry,
} from "@/lib/assessment";
import {
  APPROVED_EXTERNAL_RESOURCE_URLS,
  RETIRED_RESOURCE_URLS,
} from "../../../supabase/functions/send-webhook/v2.ts";

const LISTING_ARCHIVED = ["ata", "mpv", "tacm", "story-algorithm", "foc", "create-launch-sell"];
const byId = (id: string) => CATALOG.find((e) => e.id === id)!;

describe("CAH catalog adapter", () => {
  it("records a last-reviewed date", () => {
    expect(CATALOG_LAST_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("archived CAH listings are not recommended, and are not labelled as discontinued products", () => {
    for (const id of LISTING_ARCHIVED) {
      const e = byId(id);
      expect(e.cahListing).toBe("archived");
      expect(e.product.status).toBe("unconfirmed");
      expect(NOT_RECOMMENDABLE_IDS.has(id)).toBe(true);
      expect(RETIRED_URLS.has(resourceUrl(id))).toBe(true);
    }
  });

  it("excludes CPM / Anti-Clone Decoder and products that are being updated or coming soon", () => {
    for (const id of ["cpm", "anti-clone-decoder", "the-map", "the-decision-point", "studio-velora"]) {
      expect(NOT_RECOMMENDABLE_IDS.has(id)).toBe(true);
    }
    expect(recommendability(byId("cpm"))).toEqual({ ok: false, reason: "eligibility-not-evidenced" });
    expect(byId("studio-velora").product.status).toBe("coming_soon");
    expect(byId("the-map").product.status).toBe("being_updated");
  });

  it("does not auto-recommend entries with unestablished scope", () => {
    expect(recommendability(byId("workflow-hub"))).toEqual({ ok: false, reason: "scope-not-established" });
    expect(recommendability(byId("aifluencer-studio"))).toEqual({ ok: false, reason: "scope-not-established" });
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

  it("server allow-list and retired list match the client catalog", () => {
    expect([...APPROVED_EXTERNAL_RESOURCE_URLS].sort()).toEqual([...OWNER_APPROVED_LINKS].sort());
    for (const u of RETIRED_URLS) expect(RETIRED_RESOURCE_URLS.has(u)).toBe(true);
  });

  it("validateCatalog drops malformed and duplicate entries", () => {
    const { valid, issues } = validateCatalog([CATALOG[0], CATALOG[0], { id: "BAD ID" }, null]);
    expect(valid.map((e) => e.id)).toEqual([CATALOG[0].id]);
    expect(issues.length).toBe(3);
  });
});

describe("DWA owner correction", () => {
  const dwa = byId("dwa");

  it("is an owner-confirmed active product even though its CAH listing is archived", () => {
    expect(dwa.name).toBe("Digital Wealth Academy 4.0");
    expect(dwa.product).toMatchObject({ status: "active", source: "owner-confirmed" });
    expect(dwa.cahListing).toBe("archived");
    expect(recommendability(dwa)).toEqual({ ok: true });
    expect(NOT_RECOMMENDABLE_IDS.has("dwa")).toBe(false);
  });

  it("routes to the owner-provided link, keeps link verification separate, and never to /resources/dwa", () => {
    expect(dwa.destination?.kind).toBe("owner-provided");
    expect(dwa.destination?.url).toBe(
      "https://www.fanbasis.com/agency-checkout/digitalwealthacademy/rkq5k?affiliate=DiamondDigitalDiva"
    );
    expect(dwa.destination?.verification.state).toBe("pending");
    expect(RETIRED_URLS.has(resourceUrl("dwa"))).toBe(true);

    const pointedAtCah: CatalogEntry = {
      ...dwa,
      destination: { ...dwa.destination!, kind: "cah-resource", url: resourceUrl("dwa") },
    };
    expect(recommendability(pointedAtCah).ok).toBe(false);
  });

  it("is recommended for an early digital-products creator who is open to paid support", () => {
    const r = buildResult({
      q_stage: "stage_starting",
      q_avenue: "avenue_digital_products",
      q_goal: "goal_first_offer",
      q_clarity: "clarity_audience",
      q_evidence: "evidence_none",
      q_time: "time_8_15",
      q_owned: "owned_nothing",
      q_support: "support_open",
    });
    expect(r.ok).toBe(true);
    const dwaRec = r.result!.resources.find((x) => x.id === "dwa");
    expect(dwaRec?.url).toBe(DWA_OWNER_LINK);
    expect(dwaRec?.destinationLabel).toBe("External checkout page");
  });

  it("a failed link or an unapproved external URL stops routing without changing product status", () => {
    const failed: CatalogEntry = {
      ...dwa,
      destination: { ...dwa.destination!, verification: { ...dwa.destination!.verification, state: "failed" } },
    };
    expect(recommendability(failed)).toEqual({ ok: false, reason: "link-failed" });
    expect(failed.product.status).toBe("active");

    const other: CatalogEntry = { ...dwa, destination: { ...dwa.destination!, url: "https://example.com/x" } };
    expect(recommendability(other)).toEqual({ ok: false, reason: "external-link-not-approved" });
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
  const profile = {
    priority: "conversion" as const,
    secondaryPriority: null,
    avenue: "digital_products" as const,
    stage: "launched" as const,
    hasOffer: true,
    hasSales: false,
  };

  it("an unusable catalog yields no resources but a full plan", () => {
    const r = buildResult(answers, "not-a-list");
    expect(r.ok).toBe(true);
    expect(r.result!.resources).toEqual([]);
    expect(r.result!.immediateAction).toBeTruthy();
    expect(r.result!.plan.steps).toHaveLength(3);
    expect(r.result!.creatorPath?.slug).toBe("digital-income");
  });

  it("a catalog that throws is caught and reported as a fallback", () => {
    const exploding = [{ ...CATALOG[0], eligible: () => { throw new Error("boom"); } }];
    expect(matchResources(profile, exploding)).toEqual({ resources: [], catalogError: true });
    const r = buildResult(answers, exploding);
    expect(r.result!.catalogFallback).toBe(true);
    expect(r.result!.resourcesNote).toMatch(/couldn't load/);
  });

  it("a non-recommendable ID smuggled in with active flags is never returned", () => {
    const smuggled = [{ ...CATALOG[0], id: "foc", destination: { ...CATALOG[0].destination!, url: resourceUrl("foc") } }];
    expect(matchResources(profile, smuggled).resources).toEqual([]);
  });

  it("a retired URL smuggled under an active ID is never returned", () => {
    const smuggled = [{ ...CATALOG[0], destination: { ...CATALOG[0].destination!, url: resourceUrl("dwa") } }];
    expect(matchResources(profile, smuggled).resources).toEqual([]);
  });
});
