import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// Input validation functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

const isValidString = (str: unknown, maxLength: number = 100): str is string => {
  return typeof str === 'string' && str.trim().length > 0 && str.length <= maxLength;
};

const isValidNullableString = (str: unknown, maxLength: number = 100): str is string | null => {
  return str === null || (typeof str === 'string' && str.length <= maxLength);
};

const isValidTimestamp = (timestamp: unknown): timestamp is string => {
  if (typeof timestamp !== 'string') return false;
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
};

const isValidSource = (source: unknown): source is string => {
  if (typeof source !== 'string' || source.length > 500) return false;
  try {
    new URL(source);
    return true;
  } catch {
    return source.length > 0 && source.length <= 500;
  }
};

// Sanitize string to remove control characters
const sanitizeString = (str: string): string => {
  return str.replace(/[\x00-\x1F\x7F]/g, '').trim();
};

const isValidUrl = (url: unknown): url is string => {
  if (typeof url !== 'string' || url.length > 500) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isValidNullableUrl = (url: unknown): url is string | null => {
  if (url === null) return true;
  return isValidUrl(url);
};

interface QuizPayload {
  firstName: string;
  email: string;
  primaryStage: string;
  secondaryStage: string | null;
  primaryStageUrl: string;
  secondaryStageUrl: string | null;
  timestamp: string;
  source: string;
}

const validatePayload = (payload: unknown): { valid: true; data: QuizPayload } | { valid: false; error: string } => {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid payload format' };
  }

  const p = payload as Record<string, unknown>;

  if (!isValidString(p.firstName, 100)) {
    return { valid: false, error: 'Invalid or missing firstName' };
  }

  if (!isValidString(p.email, 255) || !isValidEmail(p.email as string)) {
    return { valid: false, error: 'Invalid or missing email' };
  }

  if (!isValidString(p.primaryStage, 100)) {
    return { valid: false, error: 'Invalid or missing primaryStage' };
  }

  if (!isValidNullableString(p.secondaryStage, 100)) {
    return { valid: false, error: 'Invalid secondaryStage' };
  }

  if (!isValidUrl(p.primaryStageUrl)) {
    return { valid: false, error: 'Invalid or missing primaryStageUrl' };
  }

  if (!isValidNullableUrl(p.secondaryStageUrl)) {
    return { valid: false, error: 'Invalid secondaryStageUrl' };
  }

  if (!isValidTimestamp(p.timestamp)) {
    return { valid: false, error: 'Invalid or missing timestamp' };
  }

  if (!isValidSource(p.source)) {
    return { valid: false, error: 'Invalid or missing source' };
  }

  return {
    valid: true,
    data: {
      firstName: sanitizeString(p.firstName as string),
      email: sanitizeString(p.email as string).toLowerCase(),
      primaryStage: sanitizeString(p.primaryStage as string),
      secondaryStage: p.secondaryStage ? sanitizeString(p.secondaryStage as string) : null,
      primaryStageUrl: p.primaryStageUrl as string,
      secondaryStageUrl: p.secondaryStageUrl as string | null,
      timestamp: p.timestamp as string,
      source: sanitizeString(p.source as string),
    }
  };
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
    // Get webhook URL from environment (secret)
    const webhookUrl = Deno.env.get('LEADCONNECTOR_WEBHOOK_URL');
    if (!webhookUrl) {
      console.error('LEADCONNECTOR_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawPayload = await req.json();
    
    // Validate and sanitize the payload
    const validation = validatePayload(rawPayload);
    if (!validation.valid) {
      console.log("Validation failed:", validation.error);
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = validation.data;
    
    // Log only that a submission was received (no PII)
    console.log("Quiz submission received, forwarding to webhook...");

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseStatus = response.status;
    
    // Log status for debugging (server-side only)
    console.log("Webhook response status:", responseStatus);

    if (!response.ok) {
      // Log detailed error server-side only
      const responseText = await response.text();
      console.error("Webhook failed - Status:", responseStatus, "Response:", responseText);
      
      // Return generic error to client
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to process submission. Please try again."
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Submission received"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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
