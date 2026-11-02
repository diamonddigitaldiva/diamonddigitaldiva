import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleSubmission, WEBHOOK_TIMEOUT_MS } from "./submission.ts";
import { fetchCahFeed, type V3CatalogSource } from "../_shared/map-v3/feed.ts";

// Server-side read of the public CAH catalog feed (no key). A successful read
// is reused for 60 seconds so removals/sold-out changes show up quickly; a
// failed read is never cached and never replaced by an older list.
const CATALOG_TTL_MS = 60_000;
let catalogCache: { at: number; value: V3CatalogSource } | null = null;
async function loadCatalog(): Promise<V3CatalogSource> {
  const now = Date.now();
  if (catalogCache && now - catalogCache.at < CATALOG_TTL_MS) return catalogCache.value;
  const value = await fetchCahFeed((url, init) => fetch(url, init));
  if (value.status === "live") catalogCache = { at: now, value };
  else console.log(`CAH catalog feed unavailable (${value.reason}); no paid suggestions in this result`);
  return value;
}

// CORS headers - allow all origins for public quiz
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per IP

// In-memory rate limit store (resets on function cold start)
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

// Clean up old entries periodically to prevent memory leaks
const cleanupRateLimitStore = () => {
  const now = Date.now();
  for (const [ip, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(ip);
    }
  }
};

// Check if request is rate limited
const isRateLimited = (ip: string): { limited: boolean; remaining: number; resetIn: number } => {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return { limited: false, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const resetIn = RATE_LIMIT_WINDOW_MS - (now - record.windowStart);
    return { limited: true, remaining: 0, resetIn };
  }

  record.count++;
  const resetIn = RATE_LIMIT_WINDOW_MS - (now - record.windowStart);
  return { limited: false, remaining: MAX_REQUESTS_PER_WINDOW - record.count, resetIn };
};

// Get client IP from request headers
const getClientIP = (req: Request): string => {
  // Check various headers for client IP (in order of preference)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  return 'unknown';
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Clean up old rate limit entries
  cleanupRateLimitStore();

  // Check rate limit
  const clientIP = getClientIP(req);
  const rateLimit = isRateLimited(clientIP);
  
  if (rateLimit.limited) {
    console.log(`Rate limit exceeded for IP: ${clientIP.substring(0, 8)}...`);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Too many submissions. Please wait a moment and try again.' 
      }),
      { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil(rateLimit.resetIn / 1000).toString(),
          'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(rateLimit.resetIn / 1000).toString()
        } 
      }
    );
  }

  // Check content length to prevent oversized payloads (max 10KB)
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 10240) {
    return new Response(
      JSON.stringify({ success: false, error: 'Payload too large' }),
      { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const rawPayload = await req.json();

    // Validation (including declared assessment version) happens before any
    // write or send. The result is saved first, then delivered to the CRM.
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { status, body } = await handleSubmission(rawPayload, {
      webhookUrl: Deno.env.get('LEADCONNECTOR_WEBHOOK_URL') || undefined,
      save: async (row) => {
        const { data, error } = await supabase.from('quiz_submissions').insert(row).select('id').single();
        if (error) console.error("Database insert error:", error.message);
        return error || !data?.id ? null : String(data.id);
      },
      markSent: async (id) => {
        const { error } = await supabase
          .from('quiz_submissions')
          .update({ webhook_sent: true, webhook_sent_at: new Date().toISOString(), webhook_inflight_until: null })
          .eq('id', id);
        if (error) console.error("Failed to update webhook status:", error.message);
      },
      release: async (id) => {
        const { error } = await supabase
          .from('quiz_submissions')
          .update({ webhook_inflight_until: null })
          .eq('id', id)
          .eq('webhook_sent', false);
        if (error) console.error("Failed to release delivery lock:", error.message);
      },
      post: (url, json) =>
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: json,
          signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
        }),
      loadCatalog,
      log: (m) => console.log(m),
    });

    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    // Log detailed error server-side only
    console.error("Error in send-webhook function:", error);
    
    // Return generic error to client
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "An unexpected error occurred. Please try again."
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
