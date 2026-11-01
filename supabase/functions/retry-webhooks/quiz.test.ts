import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { MAX_RETRY_ATTEMPTS, mayForward, retryQuizSubmissions, type QuizRetryDeps, type QuizRow } from "./quiz.ts";

// In-memory fake of the claim/finish database functions. No database, no CRM.

interface Stored extends QuizRow {
  webhook_sent: boolean;
  locked: boolean;
}

const row = (id: string, extra: Partial<Stored> = {}): Stored => ({
  id,
  first_name: "Test",
  email: "test@example.invalid",
  primary_stage: "Stage",
  secondary_stage: null,
  primary_stage_url: "https://creatoraccesshub.diamonddigitaldiva.com",
  secondary_stage_url: null,
  created_at: "2026-01-01T00:00:00.000Z",
  source: "https://preview.example",
  assessment_version: null,
  answers: null,
  result: null,
  retry_count: 0,
  webhook_sent: false,
  locked: false,
  ...extra,
});

function store(rows: Stored[]) {
  const posts: string[] = [];
  const claim = async (exclude: string[]) => {
    await Promise.resolve(); // yield, like a real round trip
    const r = rows.find(
      (x) => !x.webhook_sent && !x.locked && (x.retry_count ?? 0) < MAX_RETRY_ATTEMPTS && !exclude.includes(x.id)
    );
    if (!r) return null;
    r.locked = true; // atomic in the fake: no await between check and set
    return { ...r };
  };
  const finish = async (id: string, delivered: boolean) => {
    await Promise.resolve();
    const r = rows.find((x) => x.id === id)!;
    r.retry_count = (r.retry_count ?? 0) + 1;
    r.locked = false;
    if (delivered) r.webhook_sent = true;
  };
  const released: string[] = [];
  const release = async (id: string) => {
    await Promise.resolve();
    released.push(id);
    rows.find((x) => x.id === id)!.locked = false;
  };
  return { posts, claim, finish, release, released };
}

function deps(s: ReturnType<typeof store>, post: QuizRetryDeps["post"]): QuizRetryDeps {
  return {
    claimNext: s.claim,
    finish: s.finish,
    release: s.release,
    post: async (body) => {
      s.posts.push(body);
      await new Promise((r) => setTimeout(r, 1));
      return post(body);
    },
  };
}

Deno.test("two overlapping runs never post the same row twice", async () => {
  const rows = ["a", "b", "c", "d"].map((id, i) => row(id, { email: `t${i}@example.invalid` }));
  const s = store(rows);
  const ok = () => Promise.resolve({ ok: true, status: 200 });
  const [r1, r2] = await Promise.all([retryQuizSubmissions(deps(s, ok)), retryQuizSubmissions(deps(s, ok))]);
  assertEquals(s.posts.length, 4);
  assertEquals(new Set(s.posts.map((b) => JSON.parse(b).email)).size, 4);
  assertEquals(r1.succeeded + r2.succeeded, 4);
  assertEquals(rows.every((r) => r.webhook_sent && r.retry_count === 1 && !r.locked), true);
});

Deno.test("a row locked by the initial send or another runner is skipped", async () => {
  const rows = [row("a", { locked: true })];
  const s = store(rows);
  const out = await retryQuizSubmissions(deps(s, () => Promise.resolve({ ok: true, status: 200 })));
  assertEquals(out.retried, 0);
  assertEquals(s.posts.length, 0);
});

Deno.test("retries stop at 10 attempts in total", async () => {
  const rows = [row("a", { retry_count: 0 })];
  const s = store(rows);
  for (let i = 0; i < 15; i++) {
    await retryQuizSubmissions(deps(s, () => Promise.resolve({ ok: false, status: 502 })));
  }
  assertEquals(s.posts.length, 10);
  assertEquals(rows[0].retry_count, 10);
  assertEquals(rows[0].webhook_sent, false);
  assertEquals(rows[0].locked, false);
});

Deno.test("thrown network/timeout errors count as an attempt and release the lock", async () => {
  const rows = [row("a", { retry_count: 9 })];
  const s = store(rows);
  const out = await retryQuizSubmissions(deps(s, () => Promise.reject(new DOMException("timed out", "TimeoutError"))));
  assertEquals(out.failed, 1);
  assertEquals(rows[0].retry_count, 10);
  assertEquals(rows[0].locked, false);
  // At the cap now: never claimed again.
  await retryQuizSubmissions(deps(s, () => Promise.resolve({ ok: true, status: 200 })));
  assertEquals(s.posts.length, 1);
});

Deno.test("a failed row is attempted only once per run even though its lock is released", async () => {
  const rows = [row("a"), row("b")];
  const s = store(rows);
  const out = await retryQuizSubmissions(deps(s, () => Promise.resolve({ ok: false, status: 500 })));
  assertEquals(out, { retried: 2, succeeded: 0, failed: 2 });
  assertEquals(rows.map((r) => r.retry_count), [1, 1]);
});

Deno.test("versioned stored data is resent unchanged; legacy rows stay legacy", async () => {
  const v3 = row("a", { assessment_version: "map-v3.0", marketing_consent: true, answers: { m3_where: "where_new" }, result: { version: "map-v3.0" } });
  const legacy = row("b");
  const s = store([v3, legacy]);
  await retryQuizSubmissions(deps(s, () => Promise.resolve({ ok: true, status: 200 })));
  const [p1, p2] = s.posts.map((b) => JSON.parse(b));
  assertEquals(p1.assessmentVersion, "map-v3.0");
  assertEquals(p1.answers, { m3_where: "where_new" });
  assertEquals("assessmentVersion" in p2, false);
  assertEquals(Object.keys(p2).sort(), ["email", "firstName", "primaryStage", "primaryStageUrl", "secondaryStage", "secondaryStageUrl", "source", "timestamp"]);
});

Deno.test("retry never posts v3 rows without explicit consent or suppressed rows", async () => {
  const rows = [
    row("v3false", { assessment_version: "map-v3.0", marketing_consent: false, crm_forwarding_status: "suppressed_no_consent" }),
    row("v3null", { assessment_version: "map-v3.0", marketing_consent: null }),
    row("v3true", {
      assessment_version: "map-v3.0",
      marketing_consent: true,
      marketing_consent_at: "2026-11-01T19:00:00.000Z",
      marketing_consent_source: "map-lead-form",
      marketing_consent_version: "map-marketing-consent-v1",
      email: "yes@example.invalid",
    }),
    row("legacy", { email: "legacy@example.invalid" }),
  ];
  // Even if a buggy claim handed them out, the loop must not post them.
  const s = store(rows);
  const out = await retryQuizSubmissions(deps(s, () => Promise.resolve({ ok: true, status: 200 })));
  assertEquals(out.retried, 2);
  const sent = s.posts.map((b) => JSON.parse(b));
  assertEquals(sent.map((p) => p.email).sort(), ["legacy@example.invalid", "yes@example.invalid"]);
  const yes = sent.find((p) => p.email === "yes@example.invalid");
  assertEquals(yes.marketingConsent, true);
  assertEquals(yes.marketingConsentAt, "2026-11-01T19:00:00.000Z"); // stored consent preserved
  assertEquals("marketingConsent" in sent.find((p) => p.email === "legacy@example.invalid"), false);
  assertEquals(s.released.sort(), ["v3false", "v3null"]);
  assertEquals(rows.find((r) => r.id === "v3null")!.retry_count, 0); // not counted as an attempt
});

Deno.test("mayForward: legacy and v2 unchanged, v3 needs explicit true", () => {
  assertEquals(mayForward(row("a")), true);
  assertEquals(mayForward(row("b", { assessment_version: "map-v2.0" })), true);
  assertEquals(mayForward(row("c", { assessment_version: "map-v3.0" })), false);
  assertEquals(mayForward(row("d", { assessment_version: "map-v3.0", marketing_consent: true })), true);
  assertEquals(mayForward(row("e", { crm_forwarding_status: "suppressed_no_consent" })), false);
});
