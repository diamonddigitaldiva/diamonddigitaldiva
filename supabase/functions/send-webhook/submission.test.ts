import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleSubmission, type SubmissionDeps } from "./submission.ts";

// Fakes only: no database, no CRM webhook, no network.

const comfort = { cw_camera: "cmf_open", cw_voice: "cmf_open", cw_avatar: "cmf_open", cw_faceless: "cmf_open", cw_messages: "cmf_open", cw_outreach: "cmf_open" };
const v3Answers = () => ({
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
const legacy = () => ({
  firstName: "Test",
  email: "test@example.invalid",
  primaryStage: "Some stage",
  secondaryStage: null,
  primaryStageUrl: "https://creatoraccesshub.diamonddigitaldiva.com/creator-paths/quotes",
  secondaryStageUrl: null,
  timestamp: new Date().toISOString(),
  source: "https://preview.example",
});

function fakes(opts: { webhookUrl?: string; saveId?: string | null; postOk?: boolean; postThrows?: boolean } = {}) {
  const calls = { save: [] as Record<string, unknown>[], post: [] as string[], markSent: [] as string[], release: [] as string[] };
  const deps: SubmissionDeps = {
    webhookUrl: "webhookUrl" in opts ? opts.webhookUrl : "https://crm.fake/hook",
    save: (row) => {
      calls.save.push(row);
      return Promise.resolve(opts.saveId === undefined ? "row-1" : opts.saveId);
    },
    markSent: (id) => {
      calls.markSent.push(id);
      return Promise.resolve();
    },
    release: (id) => {
      calls.release.push(id);
      return Promise.resolve();
    },
    now: () => Date.parse("2026-01-01T00:00:00.000Z"),
    post: (_url, body) => {
      calls.post.push(body);
      if (opts.postThrows) return Promise.reject(new Error("network"));
      return Promise.resolve({ ok: opts.postOk ?? true, status: opts.postOk === false ? 502 : 200 });
    },
  };
  return { deps, calls };
}

Deno.test("delivered: success contract unchanged and row marked sent", async () => {
  const { deps, calls } = fakes();
  const r = await handleSubmission({ ...legacy(), assessmentVersion: "map-v3.0", answers: v3Answers() }, deps);
  assertEquals(r.status, 200);
  assertEquals(r.body.success, true);
  assertEquals(r.body.saved, true);
  assertEquals(r.body.delivered, true);
  assertEquals(calls.markSent, ["row-1"]);
  const sent = JSON.parse(calls.post[0]);
  assertEquals(sent.assessmentVersion, "map-v3.0");
  assertEquals(sent.primaryStage, "Explaining your offer's value");
});

Deno.test("webhook URL missing: result is still saved, delivery reported unavailable, nothing sent", async () => {
  const { deps, calls } = fakes({ webhookUrl: undefined });
  const r = await handleSubmission({ ...legacy(), assessmentVersion: "map-v3.0", answers: v3Answers() }, deps);
  assertEquals(calls.save.length, 1);
  assertEquals(calls.post.length, 0);
  assertEquals(r.status, 202);
  assertEquals(r.body, { success: false, saved: true, delivered: false, queued: false, message: "Saved; delivery unavailable" });
});

Deno.test("webhook fails after save: queued for the retry job, success stays false", async () => {
  for (const o of [{ postOk: false }, { postThrows: true }]) {
    const { deps, calls } = fakes(o);
    const r = await handleSubmission(legacy(), deps);
    assertEquals(r.status, 202);
    assertEquals(r.body.success, false);
    assertEquals(r.body.saved, true);
    assertEquals(r.body.delivered, false);
    assertEquals(r.body.queued, true);
    assertEquals(calls.markSent.length, 0);
    assertEquals(calls.release, ["row-1"]);
  }
});

Deno.test("save and delivery both fail: 500, nothing claimed", async () => {
  const { deps } = fakes({ saveId: null, postOk: false });
  const r = await handleSubmission(legacy(), deps);
  assertEquals(r.status, 500);
  assertEquals(r.body.saved, false);
  assertEquals(r.body.delivered, false);
});

Deno.test("malformed or incomplete declared v3 is rejected with 400 before any write or send", async () => {
  const missing = v3Answers() as Record<string, unknown>;
  delete missing.m3_obstacle;
  const bad = [
    { assessmentVersion: "map-v3.0", answers: missing },
    { assessmentVersion: "map-v3.0", answers: "nope" },
    { assessmentVersion: "map-v3.0" },
    { assessmentVersion: "map-v3.9", answers: v3Answers() },
  ];
  for (const extra of bad) {
    const { deps, calls } = fakes();
    const r = await handleSubmission({ ...legacy(), ...extra }, deps);
    assertEquals(r.status, 400);
    assertEquals(r.body.success, false);
    assertEquals(calls.save.length, 0);
    assertEquals(calls.post.length, 0);
  }
});

Deno.test("explicit unknown version is rejected before any write or send", async () => {
  for (const v of ["map-v9.0", "v1", "", 42, null]) {
    const { deps, calls } = fakes();
    const r = await handleSubmission({ ...legacy(), assessmentVersion: v }, deps);
    assertEquals(r.status, 400);
    assertEquals(calls.save.length + calls.post.length, 0);
  }
});

Deno.test("legacy (no version) submission is unchanged: saved and sent with legacy fields only", async () => {
  const { deps, calls } = fakes();
  const r = await handleSubmission(legacy(), deps);
  assertEquals(r.status, 200);
  assertEquals(calls.save[0].assessment_version, null);
  const sent = JSON.parse(calls.post[0]);
  assertEquals(Object.keys(sent).sort(), Object.keys(legacy()).sort());
  assert(!("marketingConsent" in sent));
});

Deno.test("v2 submission keeps working; a malformed v2 block is dropped, not rejected", async () => {
  const ok = fakes();
  const v2 = {
    assessmentVersion: "map-v2.0",
    answers: { q_stage: "stage_launched", q_avenue: "avenue_digital_products" },
    result: {
      version: "map-v2.0", priority: "conversion", priorityLabel: "Turning interest into sales", secondaryPriority: null,
      tiedWith: [], avenue: "digital_products", avenueLabel: "Digital products and services", stage: "launched",
      stageLabel: "Launched", spend: "open_to_paid", immediateAction: "Pick your one main offer.",
      planHorizon: "Over the next 2 weeks", planSteps: ["One"], resources: [], creatorPath: null,
    },
  };
  const r1 = await handleSubmission({ ...legacy(), ...v2 }, ok.deps);
  assertEquals(r1.status, 200);
  assertEquals(ok.calls.save[0].assessment_version, "map-v2.0");
  const bad = fakes();
  const r2 = await handleSubmission({ ...legacy(), assessmentVersion: "map-v2.0", answers: "x" }, bad.deps);
  assertEquals(r2.status, 200);
  assertEquals(bad.calls.save[0].assessment_version, null);
});

Deno.test("invalid legacy fields are rejected before any write", async () => {
  const { deps, calls } = fakes();
  const r = await handleSubmission({ ...legacy(), email: "nope" }, deps);
  assertEquals(r.status, 400);
  assertEquals(calls.save.length, 0);
});

Deno.test("initial send claims the row with a 2-minute lock, shorter than the 5-minute retry wait", async () => {
  const { deps, calls } = fakes();
  await handleSubmission(legacy(), deps);
  assertEquals(calls.save[0].webhook_inflight_until, "2026-01-01T00:02:00.000Z");
  assertEquals(calls.release.length, 0); // delivered: markSent clears the lock
  assertEquals(calls.markSent, ["row-1"]);
});
