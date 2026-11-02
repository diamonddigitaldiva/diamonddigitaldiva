import { describe, it, expect, vi } from "vitest";
import {
  adaptCahFeed,
  buildResultV3,
  fetchCahFeed,
  CAH_FEED_URL,
  CAH_BASE,
  DWA_URL,
  V3_MAP_ALLOWLIST,
  type FetchLike,
  type V3Answers,
  type V3CatalogSource,
} from "@/lib/assessment/v3";
import { CAH_FEED_SNAPSHOT_2026_11_02 as SNAP } from "../../../supabase/functions/_shared/map-v3/testdata/cahFeedSnapshot.ts";

// No network: every feed below is synthetic or the verbatim 2026-11-02 snapshot.
type Item = Record<string, unknown>;
const clone = (): { contract: string; generated_at: string; count: number; items: Item[] } => JSON.parse(JSON.stringify(SNAP));
const feedWith = (mut: (items: Item[]) => Item[]) => {
  const f = clone();
  f.items = mut(f.items);
  f.count = f.items.length;
  return f;
};
const live = (raw: unknown) => {
  const r = adaptCahFeed(raw);
  if (r.status !== "live") throw new Error(`expected live, got ${r.reason}`);
  return r;
};
const item = (id: string) => clone().items.find((i) => i.id === id)!;
const dropReason = (raw: unknown, id: string) => live(raw).dropped.find((d) => d.id === id)?.reason;

const comfort = { cw_camera: "cmf_open", cw_voice: "cmf_open", cw_avatar: "cmf_open", cw_faceless: "cmf_open", cw_messages: "cmf_open", cw_outreach: "cmf_open" };
const seller: V3Answers = {
  m3_where: "where_inconsistent",
  m3_help: ["help_improve"],
  m3_interests: ["int_digital_products"],
  m3_bring: ["bring_knowledge", "bring_offer"],
  m3_working_on: ["work_products"],
  m3_obstacle: "obst_explain",
  m3_working: ["works_engage", "works_sales"],
  m3_comfort: comfort,
  m3_time: "time3_6_10",
  m3_device: "dev_mac",
  m3_budget: "budget_300p",
  m3_support: ["sup_guide"],
};
const result = (a: V3Answers, c: V3CatalogSource) => {
  const b = buildResultV3(a, c);
  if (!b.ok) throw new Error("answers invalid");
  return b.result;
};
const ids = (r: { resources: { id: string }[] }) => r.resources.map((x) => x.id);

describe("CAH feed adapter (cah-map-catalog/v1)", () => {
  it("accepts today's real feed: 17 reviewed items, editorial order, feed prices and links", () => {
    const c = live(SNAP);
    expect(c.entries).toHaveLength(17);
    expect(c.dropped).toEqual([]);
    const order = V3_MAP_ALLOWLIST.map((a) => a.id);
    expect(c.entries.map((e) => e.id)).toEqual(order.filter((id) => c.entries.some((e) => e.id === id)));
    const byId = Object.fromEntries(c.entries.map((e) => [e.id, e]));
    expect(byId["dwa"].destination!.url).toBe(DWA_URL);
    expect(byId["cfw"].price).toEqual({ state: "unverified" });
    expect(byId["faceless-launch"].price).toEqual({ state: "unverified" });
    expect(byId["aica"].price).toMatchObject({ state: "verified", usd: 247 });
    expect(byId["prompt-to-sales"].includedIn).toEqual(["res_secret_sauce"]);
    expect(byId["prompt-to-sales"].kind).toBe("tool");
    expect(byId["0-first-sale-challenge"].name).toBe("$0 → FIRST SALE CHALLENGE");
    expect(byId["paid-with-ai"].requires).toMatchObject({ platforms: ["windows", "mac"], paidClaude: true, outreach: true });
    expect(byId["100k-threads-challenge"].requires!.socialPlatforms).toEqual({ ids: ["plat_threads"], mode: "required" });
    expect(byId["tss"].requires!.socialPlatforms).toEqual({ ids: ["plat_instagram"], mode: "avoid-mismatch" });
    for (const e of c.entries) expect(e.affiliate).toBe(true);
  });

  it("an empty feed is valid: no paid suggestions, a full free plan and a Hub browse link", () => {
    const r = result(seller, live(feedWith(() => [])));
    expect(r.resources.filter((x) => x.id !== "monetize-what-you-know")).toEqual([]);
    expect(r.primary.nextStep.length).toBeGreaterThan(20);
    expect(r.browse.url).toBe(CAH_BASE);
    expect(r.resourcesNote).toMatch(/browse the Creator Access Hub/);
    expect(r.catalog.source).toBe("cah-feed");
  });

  it("a product removed from the feed is no longer suggested", () => {
    const before = result(seller, live(SNAP));
    expect(ids(before)).toContain("selling-made-simple");
    const after = result(seller, live(feedWith((items) => items.filter((i) => i.id !== "selling-made-simple"))));
    expect(ids(after)).not.toContain("selling-made-simple");
  });

  it("sold-out, coming-soon or being-updated items are dropped", () => {
    const soldOut = feedWith((items) => items.map((i) => (i.id === "selling-made-simple" ? { ...i, availability: { state: "sold_out", coming_soon: false, being_updated: false } } : i)));
    expect(dropReason(soldOut, "selling-made-simple")).toBe("sold-out");
    expect(ids(result(seller, live(soldOut)))).not.toContain("selling-made-simple");
    const soon = feedWith((items) => items.map((i) => (i.id === "aica" ? { ...i, availability: { state: "available", coming_soon: true, being_updated: false } } : i)));
    expect(dropReason(soon, "aica")).toBe("not-available");
    const upd = feedWith((items) => items.map((i) => (i.id === "aica" ? { ...i, availability: { state: "available", coming_soon: false, being_updated: true } } : i)));
    expect(dropReason(upd, "aica")).toBe("not-available");
  });

  it("4 Fig Days stays excluded as sold out; 4-Figure Clients is a different product and is simply not on The MAP's list", () => {
    const base = item("daily-sales-rhythm");
    const f = feedWith((items) => [
      ...items,
      { ...base, id: "4-fig-days", title: "4 Fig Days", cah_url: `${CAH_BASE}/resources/4-fig-days`, destination: { kind: "cah-resource", url: `${CAH_BASE}/resources/4-fig-days`, verification: "owner_confirmed" } },
      { ...base, id: "4-figure-clients", title: "4-Figure Clients", cah_url: `${CAH_BASE}/resources/4-figure-clients`, destination: { kind: "cah-resource", url: `${CAH_BASE}/resources/4-figure-clients`, verification: "owner_confirmed" } },
    ]);
    expect(dropReason(f, "4-fig-days")).toBe("blocked:sold-out");
    expect(dropReason(f, "4-figure-clients")).toBe("not-on-map-allowlist");
  });

  it("new feed products are never eligible automatically, and CAH 'not preferred' is respected", () => {
    const base = item("daily-sales-rhythm");
    const f = feedWith((items) => [
      ...items.map((i) => (i.id === "aica" ? { ...i, map_preferred: false } : i)),
      { ...base, id: "brand-new-course", title: "Brand New Course", destination: { kind: "cah-resource", url: `${CAH_BASE}/resources/brand-new-course`, verification: "owner_confirmed" } },
    ]);
    expect(dropReason(f, "brand-new-course")).toBe("not-on-map-allowlist");
    expect(dropReason(f, "aica")).toBe("not-cah-preferred");
  });

  it("blocked MAP items stay out even if the feed lists them (Offer Fix scope, pending, Decision Point waitlist)", () => {
    const base = item("daily-sales-rhythm");
    const f = feedWith((items) => [
      ...items,
      ...["the-offer-fix", "quote-society", "insta-expand", "the-decision-point"].map((id) => ({
        ...base,
        id,
        destination: { kind: "cah-resource", url: `${CAH_BASE}/resources/${id}`, verification: "owner_confirmed" },
      })),
    ]);
    expect(dropReason(f, "the-offer-fix")).toBe("blocked:scope-not-established");
    expect(dropReason(f, "quote-society")).toBe("blocked:pending");
    expect(dropReason(f, "insta-expand")).toBe("blocked:pending");
    expect(dropReason(f, "the-decision-point")).toBe("blocked:waitlist-only");
  });

  it("links: retired CAH pages, mismatched pages and unapproved external links are dropped", () => {
    const retired = feedWith((items) => items.map((i) => (i.id === "dwa" ? { ...i, destination: { kind: "cah-resource", url: `${CAH_BASE}/resources/dwa`, verification: "owner_confirmed" } } : i)));
    expect(dropReason(retired, "dwa")).toBe("destination-retired");
    const swapped = feedWith((items) => items.map((i) => (i.id === "dwa" ? { ...i, destination: { kind: "owner-approved-external", url: "https://example.com/checkout", verification: "owner_confirmed" } } : i)));
    expect(dropReason(swapped, "dwa")).toBe("external-link-not-approved");
    const mismatch = feedWith((items) => items.map((i) => (i.id === "aica" ? { ...i, destination: { kind: "cah-resource", url: `${CAH_BASE}/resources/cfw`, verification: "owner_confirmed" } } : i)));
    expect(dropReason(mismatch, "aica")).toBe("destination-mismatch");
    const failed = feedWith((items) => items.map((i) => (i.id === "aica" ? { ...i, destination: { kind: "cah-resource", url: `${CAH_BASE}/resources/aica`, verification: "failed" } } : i)));
    expect(dropReason(failed, "aica")).toBe("link-failed");
  });

  it("unknown prerequisites, missing summaries, unknown fits and promise wording fail closed", () => {
    const f = feedWith((items) =>
      items.map((i) =>
        i.id === "aica"
          ? { ...i, prerequisites: ["needs_drone"] }
          : i.id === "cfw"
            ? { ...i, summary: "" }
            : i.id === "tss"
              ? { ...i, fits: { paths: ["crypto"], gaps: [], roles: ["improve"], stages: [] } }
              : i.id === "daily-sales-rhythm"
                ? { ...i, summary: "A routine that is guaranteed to work." }
                : i
      )
    );
    expect(dropReason(f, "aica")).toBe("unknown-prerequisite");
    expect(dropReason(f, "cfw")).toBe("scope-not-established");
    expect(dropReason(f, "tss")).toBe("no-fit");
    expect(dropReason(f, "daily-sales-rhythm")).toBe("promise-language");
  });

  it("prices: only USD one-time verified prices count; recurring or other currencies are unverified", () => {
    const f = live(
      feedWith((items) =>
        items.map((i) =>
          i.id === "aica"
            ? { ...i, price: { ...(i.price as object), kind: "monthly" } }
            : i.id === "aifluencer-studio"
              ? { ...i, price: { ...(i.price as object), currency: "EUR" } }
              : i
        )
      )
    );
    expect(f.entries.find((e) => e.id === "aica")!.price).toEqual({ state: "unverified" });
    expect(f.entries.find((e) => e.id === "aifluencer-studio")!.price).toEqual({ state: "unverified" });
  });

  it("an invalid envelope makes the whole feed unavailable (never a partial guess)", () => {
    expect(adaptCahFeed(null)).toEqual({ status: "unavailable", reason: "invalid" });
    expect(adaptCahFeed({ ...clone(), contract: "cah-map-catalog/v2" })).toEqual({ status: "unavailable", reason: "invalid" });
    expect(adaptCahFeed({ ...clone(), count: 99 })).toEqual({ status: "unavailable", reason: "invalid" });
    expect(adaptCahFeed({ ...clone(), items: "nope" })).toEqual({ status: "unavailable", reason: "invalid" });
    expect(adaptCahFeed({ ...clone(), generated_at: "yesterday" })).toEqual({ status: "unavailable", reason: "invalid" });
  });

  it("ownership: owned products and owned bundles suppress duplicates", () => {
    const c = live(SNAP);
    const owner = result({ ...seller, m3_owned: ["res_selling_made_simple"] }, c);
    expect(ids(owner)).not.toContain("selling-made-simple");
    expect(owner.ownedFits).toContain("Selling Made Simple");
    const avatar = result({ ...seller, m3_interests: ["int_ai_avatar"], m3_working_on: ["work_ai"], m3_obstacle: "obst_content", m3_owned: ["res_secret_sauce"] }, c);
    expect(avatar.excluded).toContainEqual({ id: "prompt-to-sales", reason: "included-in-owned" });
  });
});

describe("fetching the feed", () => {
  const okRes = (body: string, status = 200) => ({ ok: status === 200, status, headers: { get: () => null }, text: async () => body });

  it("uses a plain public GET with no credentials or keys", async () => {
    const f = vi.fn<FetchLike>().mockResolvedValue(okRes(JSON.stringify(SNAP)));
    const r = await fetchCahFeed(f);
    expect(r.status).toBe("live");
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(CAH_FEED_URL);
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("omit");
    expect(Object.keys(init.headers)).toEqual(["Accept"]);
  });

  it("times out instead of waiting, and the result then has no paid suggestions", async () => {
    const never: FetchLike = () => new Promise(() => {});
    const r = await fetchCahFeed(never, 30);
    expect(r).toEqual({ status: "unavailable", reason: "timeout" });
    const res = result(seller, r);
    expect(res.catalogFallback).toBe(true);
    expect(res.resources.filter((x) => x.id !== "monetize-what-you-know")).toEqual([]);
    expect(res.resourcesNote).toMatch(/couldn't load the Creator Access Hub's current resource list/);
  });

  it("HTTP errors, bad JSON, network errors and oversized bodies are 'unavailable'", async () => {
    expect(await fetchCahFeed(async () => okRes("", 503))).toEqual({ status: "unavailable", reason: "http" });
    expect(await fetchCahFeed(async () => okRes("<html>"))).toEqual({ status: "unavailable", reason: "invalid" });
    expect(await fetchCahFeed(async () => Promise.reject(new Error("offline")))).toEqual({ status: "unavailable", reason: "network" });
    expect(await fetchCahFeed(async () => okRes("x".repeat(600 * 1024)))).toEqual({ status: "unavailable", reason: "too-large" });
  });
});
