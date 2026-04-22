import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRIES_PER_RUN = 50; // Limit retries per execution
const RETRY_OLDER_THAN_MINUTES = 5; // Only retry submissions older than 5 minutes
const MAX_RETRY_ATTEMPTS = 10; // Give up after this many tries to avoid infinite loops

const HQ_INGEST_URL =
  "https://qiwrlzqryctjyyetmnpt.supabase.co/functions/v1/ingest";

async function forwardContactToHQ(submission: {
  first_name: string;
  email: string;
  message: string;
}): Promise<boolean> {
  try {
    const payload = {
      signups: [
        {
          source: "map-contact-form",
          business: "ddd",
          first_name: submission.first_name,
          email: submission.email,
          metadata: {
            channel: "contact_form",
            message: submission.message,
          },
        },
      ],
      activity: [
        {
          activity_type: "note_added",
          source: "map-contact-form",
          business: "ddd",
          first_name: submission.first_name,
          email: submission.email,
          title: `Contact message from ${submission.first_name}`,
          description: submission.message,
          metadata: {
            channel: "contact_form",
            email: submission.email,
          },
        },
      ],
    };
    const res = await fetch(HQ_INGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.error("Contact retry threw:", err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get('LEADCONNECTOR_WEBHOOK_URL');
    if (!webhookUrl) {
      console.error('LEADCONNECTOR_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get failed submissions older than 5 minutes (to avoid racing with initial send)
    const cutoffTime = new Date(Date.now() - RETRY_OLDER_THAN_MINUTES * 60 * 1000).toISOString();
    
    const { data: failedSubmissions, error: fetchError } = await supabase
      .from('quiz_submissions')
      .select('*')
      .eq('webhook_sent', false)
      .lt('created_at', cutoffTime)
      .order('created_at', { ascending: true })
      .limit(MAX_RETRIES_PER_RUN);

    if (fetchError) {
      console.error('Error fetching failed submissions:', fetchError.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Database query failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!failedSubmissions || failedSubmissions.length === 0) {
      console.log('No failed submissions to retry');
      return new Response(
        JSON.stringify({ success: true, message: 'No failed submissions', retried: 0, succeeded: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${failedSubmissions.length} failed submissions to retry`);

    let succeeded = 0;
    let failed = 0;

    for (const submission of failedSubmissions) {
      try {
        // Reconstruct the payload
        const payload = {
          firstName: submission.first_name,
          email: submission.email,
          primaryStage: submission.primary_stage,
          secondaryStage: submission.secondary_stage,
          primaryStageUrl: submission.primary_stage_url,
          secondaryStageUrl: submission.secondary_stage_url,
          timestamp: submission.created_at,
          source: submission.source,
        };

        console.log(`Retrying submission ${submission.id}...`);

        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          // Mark as sent and increment retry count
          const { error: updateError } = await supabase
            .from('quiz_submissions')
            .update({ 
              webhook_sent: true, 
              webhook_sent_at: new Date().toISOString(),
              retry_count: (submission.retry_count || 0) + 1
            })
            .eq('id', submission.id);

          if (updateError) {
            console.error(`Failed to update submission ${submission.id}:`, updateError.message);
          } else {
            console.log(`Successfully retried submission ${submission.id} (attempt ${(submission.retry_count || 0) + 1})`);
            succeeded++;
          }
        } else {
          console.error(`Webhook failed for ${submission.id} - Status: ${response.status}`);
          // Increment retry count on failure too
          await supabase
            .from('quiz_submissions')
            .update({ retry_count: (submission.retry_count || 0) + 1 })
            .eq('id', submission.id);
          failed++;
        }
      } catch (err) {
        console.error(`Error retrying submission ${submission.id}:`, err);
        failed++;
      }
    }

    console.log(`Retry complete: ${succeeded} succeeded, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Retry complete',
        retried: failedSubmissions.length,
        succeeded,
        failed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in retry-webhooks function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
