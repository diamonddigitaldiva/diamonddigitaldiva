const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HQ_INGEST_URL =
  "https://ztsortihbrewwnpgfjix.supabase.co/functions/v1/ingest";

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

  const token = Deno.env.get("HQ_INGEST_TOKEN") ?? "";
  if (!token) {
    console.error("HQ_INGEST_TOKEN is not configured");
    return new Response(
      JSON.stringify({ success: false, error: "HQ token not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const hqRes = await fetch(HQ_INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hq-token": token,
      },
      body: JSON.stringify(body),
    });

    const text = await hqRes.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }

    return new Response(
      JSON.stringify({ success: hqRes.ok, status: hqRes.status, response: json }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("report-to-hq forward failed:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
