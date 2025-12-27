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
    
    console.log("Received quiz data:", JSON.stringify(payload, null, 2));
    console.log("Forwarding to LeadConnector webhook...");

    const response = await fetch(LEADCONNECTOR_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseStatus = response.status;
    const responseText = await response.text();
    
    console.log("LeadConnector response status:", responseStatus);
    console.log("LeadConnector response body:", responseText);

    if (!response.ok) {
      console.error("LeadConnector webhook failed:", responseStatus, responseText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Webhook returned ${responseStatus}`,
          details: responseText 
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
        message: "Webhook sent successfully",
        status: responseStatus 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in send-webhook function:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
