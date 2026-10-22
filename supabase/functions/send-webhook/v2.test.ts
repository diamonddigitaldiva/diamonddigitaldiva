import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { sanitizeV2 } from "./v2.ts";

// These tests never call the CRM webhook. They exercise v2 field validation only.

const valid = () => ({
  assessmentVersion: "map-v2.0",
  answers: { q_stage: "stage_launched", q_avenue: "avenue_digital_products" },
  result: {
    version: "map-v2.0",
    priority: "conversion",
    priorityLabel: "Turning interest into sales",
    secondaryPriority: "clarity",
    tiedWith: [],
    avenue: "digital_products",
    avenueLabel: "Digital products and services",
    stage: "launched",
    stageLabel: "Launched",
    spend: "open_to_paid",
    immediateAction: "Pick your one main offer.",
    planHorizon: "Over the next 2 weeks",
    planSteps: ["One", "Two", "Three"],
    resources: [{ id: "the-offer-fix", name: "The Offer Fix", url: "https://creatoraccesshub.diamonddigitaldiva.com/resources/the-offer-fix" }],
    creatorPath: { slug: "digital-income", label: "Digital Income", url: "https://creatoraccesshub.diamonddigitaldiva.com/creator-paths/digital-income" },
  },
});

Deno.test("legacy payloads without v2 fields stay legacy", () => {
  assertEquals(sanitizeV2({ firstName: "A" }), null);
});

Deno.test("accepts a valid v2 block", () => {
  const out = sanitizeV2(valid());
  assertEquals(out?.assessmentVersion, "map-v2.0");
  assertEquals((out?.result.resources as unknown[]).length, 1);
});

Deno.test("rejects resource URLs outside the Hub or with query strings", () => {
  const a = valid();
  a.result.resources[0].url = "https://evil.example.com/x";
  assertEquals(sanitizeV2(a), null);
  const b = valid();
  b.result.resources[0].url = "https://creatoraccesshub.diamonddigitaldiva.com/resources/x?email=a@b.com";
  assertEquals(sanitizeV2(b), null);
});

Deno.test("rejects more than two resources", () => {
  const a = valid();
  a.result.resources = [a.result.resources[0], a.result.resources[0], a.result.resources[0]];
  assertEquals(sanitizeV2(a), null);
});

Deno.test("rejects mismatched version and bad answer IDs", () => {
  const a = valid();
  a.result.version = "map-v9";
  assertEquals(sanitizeV2(a), null);
  const b: Record<string, unknown> = { ...valid(), answers: { "Q STAGE!": "x" } };
  assertEquals(sanitizeV2(b), null);
});

Deno.test("strips unknown result keys", () => {
  const a = valid() as unknown as Record<string, Record<string, unknown>>;
  a.result.email = "leak@example.com";
  const out = sanitizeV2(a as unknown as Record<string, unknown>);
  assertEquals(out !== null && "email" in out.result, false);
});
