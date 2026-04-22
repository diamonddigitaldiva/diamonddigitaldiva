import { z } from "https://esm.sh/zod@3.25.76";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HQ_INGEST_URL =
  "https://qiwrlzqryctjyyetmnpt.supabase.co/functions/v1/ingest";

const eventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("quiz_completed"),
    primary_stage: z.string().max(20),
    secondary_stage: z.string().max(20).optional().nullable(),
  }),
  z.object({
    type: z.literal("link_click"),
    link_name: z.string().max(100),
    link_url: z.string().max(500).optional().nullable(),
    primary_stage: z.string().max(20).optional().nullable(),
    secondary_stage: z.string().max(20).optional().nullable(),
  }),
  z.object({
    type: z.literal("feedback_submitted"),
    rating: z.number().int().min(1).max(5).optional().nullable(),
    has_message: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("contact_message"),
    first_name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(200),
    message: z.string().trim().min(1).max(2000),
    feedback_id: z.string().uuid().optional(),
  }),
]);

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key);
}

async function markFeedbackForwarded(
  feedbackId: string,
  success: boolean,
  hqInfo?: {
    taskId: string | null;
    escalationTaskId: string | null;
    response: unknown;
  }
) {
  const client = getServiceClient();
  if (!client) return;
  try {
    if (success) {
      await client
        .from("feedback")
        .update({
          hq_forwarded: true,
          hq_forwarded_at: new Date().toISOString(),
          hq_inflight_until: null,
          hq_task_id: hqInfo?.taskId ?? null,
          hq_escalation_task_id: hqInfo?.escalationTaskId ?? null,
          hq_response: (hqInfo?.response ?? null) as never,
        })
        .eq("id", feedbackId);
    } else {
      // Release the in-flight lock and bump the retry counter so the cron
      // can prioritize / cap retries.
      const { data } = await client
        .from("feedback")
        .select("hq_retry_count")
        .eq("id", feedbackId)
        .single();
      await client
        .from("feedback")
        .update({
          hq_retry_count: (data?.hq_retry_count ?? 0) + 1,
          hq_inflight_until: null,
        })
        .eq("id", feedbackId);
    }
  } catch (err) {
    console.error("Failed to update feedback HQ status:", err);
  }
}

/**
 * Extract task IDs from the HQ ingest response. HQ may return them in a few
 * shapes; we walk defensively and match by idempotency key / task_role.
 */
function extractTaskIds(
  response: unknown,
  primaryKey: string
): { taskId: string | null; escalationTaskId: string | null } {
  const escalationKey = `${primaryKey}:escalation`;
  let taskId: string | null = null;
  let escalationTaskId: string | null = null;

  const candidates: unknown[] = [];
  const root = response as Record<string, unknown> | null;
  if (root && typeof root === "object") {
    if (Array.isArray((root as { tasks?: unknown }).tasks)) {
      candidates.push(...((root as { tasks: unknown[] }).tasks));
    }
    const data = (root as { data?: unknown }).data as Record<string, unknown> | undefined;
    if (data && Array.isArray(data.tasks)) candidates.push(...(data.tasks as unknown[]));
    const results = (root as { results?: unknown }).results as Record<string, unknown> | undefined;
    if (results && Array.isArray(results.tasks)) candidates.push(...(results.tasks as unknown[]));
  }

  for (const t of candidates) {
    if (!t || typeof t !== "object") continue;
    const task = t as Record<string, unknown>;
    const id =
      (typeof task.id === "string" && task.id) ||
      (typeof task.task_id === "string" && task.task_id) ||
      null;
    if (!id) continue;
    const meta = (task.metadata && typeof task.metadata === "object"
      ? (task.metadata as Record<string, unknown>)
      : {}) as Record<string, unknown>;
    const key =
      (typeof task.idempotency_key === "string" && task.idempotency_key) ||
      (typeof meta.idempotency_key === "string" ? (meta.idempotency_key as string) : "");
    const role = typeof meta.task_role === "string" ? (meta.task_role as string) : "";
    if (key === escalationKey || role === "escalation") {
      escalationTaskId = escalationTaskId ?? id;
    } else if (key === primaryKey || role === "primary_reply") {
      taskId = taskId ?? id;
    } else if (!taskId) {
      taskId = id;
    }
  }

  return { taskId, escalationTaskId };
}

/**
 * Atomically claim a feedback row for HQ forwarding. Returns true only if
 * THIS caller holds the claim. Prevents the initial send and the cron retry
 * from forwarding the same message twice.
 *
 * Lock TTL: 2 minutes. Auto-expires so a crashed sender doesn't permanently
 * block retries.
 */
async function tryClaimFeedback(feedbackId: string): Promise<boolean> {
  const client = getServiceClient();
  if (!client) return true; // Fail-open: better to risk a duplicate than lose the send.
  const nowIso = new Date().toISOString();
  const lockUntil = new Date(Date.now() + 2 * 60 * 1000).toISOString();
  try {
    const { data, error } = await client
      .from("feedback")
      .update({ hq_inflight_until: lockUntil })
      .eq("id", feedbackId)
      .eq("hq_forwarded", false)
      .or(`hq_inflight_until.is.null,hq_inflight_until.lt.${nowIso}`)
      .select("id");
    if (error) {
      console.error("Claim query failed:", error);
      return true; // Fail-open.
    }
    return Array.isArray(data) && data.length > 0;
  } catch (err) {
    console.error("Claim threw:", err);
    return true;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const event = parsed.data;
    const payload: Record<string, unknown> = {};

    if (event.type === "quiz_completed") {
      payload.signups = [
        {
          source: "map-diagnostic",
          business: "ddd",
          metadata: {
            primary_stage: event.primary_stage,
            secondary_stage: event.secondary_stage ?? null,
          },
        },
      ];
    } else if (event.type === "link_click") {
      payload.activity = [
        {
          activity_type: "note_added",
          source: "map-diagnostic",
          business: "ddd",
          title: `Outbound click: ${event.link_name}`,
          description: event.link_url ?? null,
          metadata: {
            link_name: event.link_name,
            link_url: event.link_url ?? null,
            primary_stage: event.primary_stage ?? null,
            secondary_stage: event.secondary_stage ?? null,
          },
        },
      ];
    } else if (event.type === "feedback_submitted") {
      payload.activity = [
        {
          activity_type: "note_added",
          source: "map-diagnostic",
          business: "ddd",
          title: `Feedback received${event.rating ? ` (${event.rating}/5)` : ""}`,
          description: event.has_message ? "User left a written message" : null,
          metadata: {
            rating: event.rating ?? null,
            has_message: event.has_message,
          },
        },
      ];
    } else if (event.type === "contact_message") {
      const submittedAt = new Date().toISOString();
      const dueAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48h SLA
      // Escalation task: becomes due once the 48h reply window closes, with a
      // 24h follow-up window before it itself is overdue (total 72h from now).
      const escalationDueAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
      const escalationStartAt = dueAt; // Don't escalate before the primary SLA expires.

      // Stable idempotency key — same value used by initial send AND any
      // retries (here or via the cron) so HQ deduplicates server-side.
      // Falls back to a content hash if no feedback_id was supplied (legacy).
      const idempotencyKey = event.feedback_id
        ? `contact:${event.feedback_id}`
        : `contact:${event.email.toLowerCase()}:${submittedAt}`;

      // Try to claim the row so two concurrent senders don't both fire.
      if (event.feedback_id) {
        const claimed = await tryClaimFeedback(event.feedback_id);
        if (!claimed) {
          console.log(
            `Skipping contact ${event.feedback_id} — already in flight or forwarded`
          );
          return new Response(
            JSON.stringify({ success: true, skipped: true, reason: "already_in_flight" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      payload.idempotency_key = idempotencyKey;
      payload.signups = [
        {
          source: "map-contact-form",
          business: "ddd",
          first_name: event.first_name,
          email: event.email,
          idempotency_key: idempotencyKey,
          metadata: {
            channel: "contact_form",
            message: event.message,
            submitted_at: submittedAt,
            idempotency_key: idempotencyKey,
          },
        },
      ];
      payload.activity = [
        {
          activity_type: "note_added",
          source: "map-contact-form",
          business: "ddd",
          first_name: event.first_name,
          email: event.email,
          idempotency_key: idempotencyKey,
          title: `Contact message from ${event.first_name}`,
          description: event.message,
          metadata: {
            channel: "contact_form",
            email: event.email,
            full_message: event.message,
            submitted_at: submittedAt,
            idempotency_key: idempotencyKey,
          },
        },
      ];
      payload.tasks = [
        {
          source: "map-contact-form",
          business: "ddd",
          first_name: event.first_name,
          email: event.email,
          idempotency_key: idempotencyKey,
          title: `Reply to contact message from ${event.first_name}`,
          description:
            `Check and respond to this contact form message within 48 hours.\n\n` +
            `From: ${event.first_name} <${event.email}>\n` +
            `Submitted: ${submittedAt}\n\n` +
            `Message:\n${event.message}`,
          due_at: dueAt,
          priority: "normal",
          metadata: {
            channel: "contact_form",
            email: event.email,
            full_message: event.message,
            submitted_at: submittedAt,
            sla_hours: 48,
            idempotency_key: idempotencyKey,
            task_role: "primary_reply",
          },
        },
        {
          source: "map-contact-form",
          business: "ddd",
          first_name: event.first_name,
          email: event.email,
          idempotency_key: `${idempotencyKey}:escalation`,
          title: `ESCALATION: Unanswered contact from ${event.first_name} (48h+)`,
          description:
            `This contact message has not been marked replied within the 48-hour SLA.\n` +
            `Confirm a reply was sent (or send one now) within the next 24 hours.\n\n` +
            `From: ${event.first_name} <${event.email}>\n` +
            `Originally submitted: ${submittedAt}\n` +
            `Primary reply was due: ${dueAt}\n` +
            `Escalation follow-up due: ${escalationDueAt}\n\n` +
            `Message:\n${event.message}\n\n` +
            `If the reply has already been sent, mark the primary "Reply to contact message" task as complete to resolve this escalation.`,
          start_at: escalationStartAt,
          due_at: escalationDueAt,
          priority: "high",
          metadata: {
            channel: "contact_form",
            email: event.email,
            full_message: event.message,
            submitted_at: submittedAt,
            sla_hours: 72,
            follow_up_window_hours: 24,
            primary_due_at: dueAt,
            escalation_starts_at: escalationStartAt,
            idempotency_key: `${idempotencyKey}:escalation`,
            parent_idempotency_key: idempotencyKey,
            task_role: "escalation",
            triggers_when: "primary_reply_not_completed_after_48h",
          },
        },
      ];
    }

    // Retry with exponential backoff: 4 attempts, ~250ms / 500ms / 1000ms delays.
    // Retries on network errors and 5xx / 408 / 429 responses; 4xx (other) fails fast.
    const MAX_ATTEMPTS = 4;
    const BASE_DELAY_MS = 250;
    const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

    let lastStatus = 0;
    let lastBody = "";
    let lastError: unknown = null;

    const hqHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (typeof payload.idempotency_key === "string") {
      hqHeaders["Idempotency-Key"] = payload.idempotency_key;
      hqHeaders["X-Idempotency-Key"] = payload.idempotency_key;
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const hqRes = await fetch(HQ_INGEST_URL, {
          method: "POST",
          headers: hqHeaders,
          body: JSON.stringify(payload),
        });

        if (hqRes.ok) {
          if (event.type === "contact_message" && event.feedback_id) {
            await markFeedbackForwarded(event.feedback_id, true);
          }
          return new Response(JSON.stringify({ success: true, attempts: attempt }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        lastStatus = hqRes.status;
        lastBody = await hqRes.text();
        console.error(`HQ ingest attempt ${attempt} failed`, lastStatus, lastBody);

        // Non-retryable client error → stop immediately.
        if (!RETRYABLE_STATUSES.has(hqRes.status)) {
          break;
        }
      } catch (err) {
        lastError = err;
        console.error(`HQ ingest attempt ${attempt} threw`, err);
      }

      if (attempt < MAX_ATTEMPTS) {
        // Exponential backoff with jitter (±20%).
        const expDelay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        const jitter = expDelay * (0.8 + Math.random() * 0.4);
        await new Promise((resolve) => setTimeout(resolve, jitter));
      }
    }

    // All attempts failed. For contact messages, leave hq_forwarded=false so
    // the retry-webhooks cron picks it up later. Bump the retry counter.
    if (event.type === "contact_message" && event.feedback_id) {
      await markFeedbackForwarded(event.feedback_id, false);
    }

    const errMsg = lastError instanceof Error ? lastError.message : lastBody || "HQ ingest failed";
    // Fire-and-forget tracking: never surface upstream HQ failure as a 5xx to the client.
    return new Response(
      JSON.stringify({ success: false, error: errMsg, status: lastStatus, attempts: MAX_ATTEMPTS, skipped: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("forward-to-hq error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
