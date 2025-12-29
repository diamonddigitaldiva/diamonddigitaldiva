import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers - allow all origins for public quiz
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
