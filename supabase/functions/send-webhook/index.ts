import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LEADCONNECTOR_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/bUUmh6cX31sAbXMXMnU9/webhook-trigger/TyS7OiDTq34zNu9CILJn";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    // Log only that a submission was received (no PII)
    console.log("Quiz submission received, forwarding to webhook...");

    const response = await fetch(LEADCONNECTOR_WEBHOOK_URL, {
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
