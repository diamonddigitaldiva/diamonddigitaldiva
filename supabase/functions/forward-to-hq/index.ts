import { z } from "https://esm.sh/zod@3.25.76";

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
  }),
]);

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
    }

    // Retry with exponential backoff: 4 attempts, ~250ms / 500ms / 1000ms delays.
    // Retries on network errors and 5xx / 408 / 429 responses; 4xx (other) fails fast.
    const MAX_ATTEMPTS = 4;
    const BASE_DELAY_MS = 250;
    const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

    let lastStatus = 0;
    let lastBody = "";
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const hqRes = await fetch(HQ_INGEST_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (hqRes.ok) {
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
