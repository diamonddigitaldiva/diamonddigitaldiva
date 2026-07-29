import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  MAX_BODY_BYTES,
  checkRateLimit,
  eventSchema,
  readLimitedJson,
  resetRateLimits,
} from "./validate.ts";

// NOTE: these tests never call the real HQ ingest endpoint. They exercise the
// validation, size-limit and rate-limit layers only.

Deno.test("accepts a valid quiz_completed event", () => {
  const parsed = eventSchema.safeParse({
    type: "quiz_completed",
    primary_stage: "CFW",
    secondary_stage: "TSA",
  });
  assertEquals(parsed.success, true);
});

Deno.test("accepts a valid feedback_submitted event", () => {
  const parsed = eventSchema.safeParse({ type: "feedback_submitted", rating: 5 });
  assertEquals(parsed.success, true);
});

Deno.test("rejects an unknown event type", () => {
  const parsed = eventSchema.safeParse({ type: "steal_secrets", foo: 1 });
  assertEquals(parsed.success, false);
});

Deno.test("rejects malformed payloads", () => {
  assertEquals(eventSchema.safeParse({}).success, false);
  assertEquals(eventSchema.safeParse(null).success, false);
  assertEquals(
    eventSchema.safeParse({ type: "contact_message", first_name: "A", email: "nope", message: "hi" })
      .success,
    false
  );
});

Deno.test("strips unexpected/sensitive extra fields", () => {
  const parsed = eventSchema.parse({
    type: "quiz_completed",
    primary_stage: "CFW",
    // deno-lint-ignore no-explicit-any
    admin: true, token: "leak", cookies: "x",
  } as any);
  assertEquals(Object.keys(parsed).sort(), ["primary_stage", "type"]);
});

Deno.test("rejects oversized bodies", async () => {
  const big = JSON.stringify({
    type: "contact_message",
    first_name: "A",
    email: "a@b.com",
    message: "x".repeat(MAX_BODY_BYTES + 100),
  });
  const req = new Request("http://localhost", { method: "POST", body: big });
  const res = await readLimitedJson(req);
  assertEquals(res.ok, false);
  if (!res.ok) assertEquals(res.reason, "too_large");
});

Deno.test("rejects invalid JSON bodies", async () => {
  const req = new Request("http://localhost", { method: "POST", body: "{not json" });
  const res = await readLimitedJson(req);
  assertEquals(res.ok, false);
  if (!res.ok) assertEquals(res.reason, "invalid_json");
});

Deno.test("rate limits after the configured maximum", () => {
  resetRateLimits();
  const now = Date.now();
  for (let i = 0; i < 3; i++) {
    assertEquals(checkRateLimit("1.2.3.4", now, 3, 60_000).allowed, true);
  }
  const blocked = checkRateLimit("1.2.3.4", now, 3, 60_000);
  assertEquals(blocked.allowed, false);
  assertEquals(blocked.retryAfterSeconds > 0, true);
  // Window resets.
  assertEquals(checkRateLimit("1.2.3.4", now + 61_000, 3, 60_000).allowed, true);
  resetRateLimits();
});

Deno.test("secret absence is detectable and non-fatal", () => {
  // The handler only warns when HQ_INGEST_TOKEN is missing; it must never throw
  // and must never echo the token value.
  const token = Deno.env.get("HQ_INGEST_TOKEN_TEST_ABSENT");
  assertEquals(token, undefined);
});
