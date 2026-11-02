import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { sanitizeV3, isV3Version } from "./v3.ts";
import { sanitizeV2 } from "./v2.ts";
import { adaptCahFeed, fetchCahFeed, type FetchLike } from "../_shared/map-v3/index.ts";
import { CAH_FEED_SNAPSHOT_2026_11_02 } from "../_shared/map-v3/testdata/cahFeedSnapshot.ts";

const LIVE = adaptCahFeed(CAH_FEED_SNAPSHOT_2026_11_02);

// These tests never call the CRM webhook or HQ. They exercise v3 validation
// and server-side re-derivation only.

const comfort = { cw_camera: "cmf_open", cw_voice: "cmf_open", cw_avatar: "cmf_open", cw_faceless: "cmf_open", cw_messages: "cmf_open", cw_outreach: "cmf_open" };
const answers = () => ({
  m3_where: "where_inconsistent",
  m3_help: ["help_improve"],
  m3_interests: ["int_digital_products"],
  m3_bring: ["bring_knowledge", "bring_offer"],
  m3_working_on: ["work_products"],
  m3_obstacle: "obst_explain",
  m3_working: ["works_engage", "works_sales"],
  m3_comfort: { ...comfort },
  m3_time: "time3_6_10",
  m3_device: "dev_mac",
  m3_budget: "budget_300p",
  m3_support: ["sup_guide"],
});
const payload = (extra: Record<string, unknown> = {}) => ({ assessmentVersion: "map-v3.0", answers: answers(), ...extra });

Deno.test("v3 result is re-derived on the server from the CAH feed; a tampered client result is ignored", () => {
  const out = sanitizeV3(payload({ result: { primary: { label: "Buy everything" }, resources: [{ id: "x", url: "https://evil.example.com" }] } }), LIVE);
  assert(out);
  const r = out.fields.result as { primary: { id: string; label: string }; resources: { url: string }[]; catalog: { source: string } };
  assert(r.resources.length > 0);
  assertEquals(r.catalog.source, "cah-feed");
  assertEquals(r.primary.id, "message");
  assertEquals(out.legacy.primaryStage, "Explaining your offer's value");
  assert(r.resources.every((x) => x.url.startsWith("https://creatoraccesshub.diamonddigitaldiva.com/resources/")));
  assertEquals(typeof out.legacy.primaryStageUrl, "string");
  assertEquals(out.legacy.secondaryStageUrl, null);
});

Deno.test("malformed or incomplete v3 answers drop all v3 data", () => {
  const missing = answers() as Record<string, unknown>;
  delete missing.m3_obstacle;
  assertEquals(sanitizeV3({ assessmentVersion: "map-v3.0", answers: missing }), null);
  assertEquals(sanitizeV3(payload({ answers: "nope" })), null);
  assertEquals(sanitizeV3(payload({ answers: { ...answers(), m3_support: ["sup_guide", "sup_video", "sup_live"] } })), null);
  assertEquals(sanitizeV3(payload({ answers: { ...answers(), m3_comfort: { cw_camera: "cmf_open" } } })), null);
  assertEquals(sanitizeV3(payload({ answers: { ...answers(), m3_notes: "x".repeat(5000) } })), null);
  assertEquals(sanitizeV3(payload({ answers: { ...answers(), m3_time: "time_lt3" } })), null);
  assertEquals(sanitizeV3({ assessmentVersion: "map-v3.9", answers: answers() }), null);
});

Deno.test("hidden answers and unknown keys are not stored", () => {
  const out = sanitizeV3(payload({ answers: { ...answers(), m3_where: "where_new", m3_bring: ["bring_skill"], evil: "<script>" } }));
  assert(out);
  assertEquals("m3_obstacle" in out.fields.answers, false);
  assertEquals("evil" in out.fields.answers, false);
});

Deno.test("phone-only answers never get a computer-only recommendation server-side", () => {
  const out = sanitizeV3(payload({
    answers: { ...answers(), m3_where: "where_new", m3_bring: ["bring_clients"], m3_interests: ["int_ai_services"], m3_device: "dev_phone", m3_working_on: undefined, m3_obstacle: undefined, m3_working: undefined },
  }), LIVE);
  assert(out);
  const ids = (out.fields.result.resources as { id: string }[]).map((x) => x.id);
  assertEquals(ids.includes("paid-with-ai"), false);
});

Deno.test("version routing: v3 detected, v2 payloads still accepted by the v2 sanitizer", () => {
  assertEquals(isV3Version("map-v3.0"), true);
  assertEquals(isV3Version("map-v2.0"), false);
  const v2 = sanitizeV2({
    assessmentVersion: "map-v2.0",
    answers: { q_stage: "stage_launched" },
    result: {
      version: "map-v2.0", priority: "conversion", priorityLabel: "Turning interest into sales", secondaryPriority: null, tiedWith: [],
      avenue: "digital_products", avenueLabel: "Digital products and services", stage: "launched", stageLabel: "Launched", spend: "open_to_paid",
      immediateAction: "Pick your one main offer.", planHorizon: "Over the next 2 weeks", planSteps: ["One"], resources: [], creatorPath: null,
    },
  });
  assertEquals(v2?.assessmentVersion, "map-v2.0");
});

Deno.test("stored v3 snapshot stays well under the request size limit", () => {
  const out = sanitizeV3(payload({ answers: { ...answers(), m3_notes: "n".repeat(1000), m3_owned_other: "o".repeat(300) } }));
  assert(out);
  assert(JSON.stringify(out.fields).length < 9000);
});

Deno.test("feed unavailable on the server: answers still validate and the stored result has no paid suggestions", async () => {
  const never: FetchLike = () => new Promise(() => {});
  const catalog = await fetchCahFeed(never, 20);
  assertEquals(catalog, { status: "unavailable", reason: "timeout" });
  const out = sanitizeV3(payload({ result: { resources: [{ id: "dwa", url: "https://www.fanbasis.com/x" }] } }), catalog);
  assert(out);
  const r = out.fields.result as { resources: { id: string }[]; catalog: { source: string } };
  assertEquals(r.resources.filter((x) => x.id !== "monetize-what-you-know"), []);
  assertEquals(r.catalog.source, "unavailable");
});

Deno.test("a product removed from the feed is not in the server-side result", () => {
  const without = adaptCahFeed({
    ...CAH_FEED_SNAPSHOT_2026_11_02,
    count: CAH_FEED_SNAPSHOT_2026_11_02.items.length - 1,
    items: CAH_FEED_SNAPSHOT_2026_11_02.items.filter((i) => i.id !== "faceless-launch"),
  });
  const before = (sanitizeV3(payload(), LIVE)!.fields.result.resources as { id: string }[]).map((x) => x.id);
  const after = (sanitizeV3(payload(), without)!.fields.result.resources as { id: string }[]).map((x) => x.id);
  assert(before.includes("faceless-launch"));
  assertEquals(after.includes("faceless-launch"), false);
});
