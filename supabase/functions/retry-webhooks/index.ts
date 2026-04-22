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
  created_at: string;
}): Promise<boolean> {
  try {
    const submittedAt = submission.created_at;
    // Due 48h after original submission. If already past due, give a 24h grace.
    const dueAtMs = new Date(submittedAt).getTime() + 48 * 60 * 60 * 1000;
    const dueAt = new Date(
      Math.max(dueAtMs, Date.now() + 24 * 60 * 60 * 1000)
    ).toISOString();

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
            submitted_at: submittedAt,
            retried: true,
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
            full_message: submission.message,
            submitted_at: submittedAt,
            retried: true,
          },
        },
      ],
      tasks: [
        {
          source: "map-contact-form",
          business: "ddd",
          first_name: submission.first_name,
          email: submission.email,
          title: `Reply to contact message from ${submission.first_name}`,
          description:
            `Check and respond to this contact form message.\n\n` +
            `From: ${submission.first_name} <${submission.email}>\n` +
            `Originally submitted: ${submittedAt}\n` +
            `(Delivered via retry — original send failed)\n\n` +
            `Message:\n${submission.message}`,
          due_at: dueAt,
          priority: "normal",
          metadata: {
            channel: "contact_form",
            email: submission.email,
            full_message: submission.message,
            submitted_at: submittedAt,
            sla_hours: 48,
            retried: true,
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

    const submissionsToRetry = failedSubmissions ?? [];
    if (submissionsToRetry.length === 0) {
      console.log('No failed quiz submissions to retry — checking contacts.');
    } else {
      console.log(`Found ${submissionsToRetry.length} failed quiz submissions to retry`);
    }

    let succeeded = 0;
    let failed = 0;

    for (const submission of submissionsToRetry) {
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

    console.log(`Quiz retry complete: ${succeeded} succeeded, ${failed} failed`);

    // ---- Retry contact form submissions to HQ ----
    const { data: pendingContacts, error: contactFetchError } = await supabase
      .from('feedback')
      .select('id, first_name, email, message, hq_retry_count')
      .eq('entry_type', 'contact')
      .eq('hq_forwarded', false)
      .lt('hq_retry_count', MAX_RETRY_ATTEMPTS)
      .lt('created_at', cutoffTime)
      .order('created_at', { ascending: true })
      .limit(MAX_RETRIES_PER_RUN);

    let contactSucceeded = 0;
    let contactFailed = 0;

    if (contactFetchError) {
      console.error('Error fetching pending contacts:', contactFetchError.message);
    } else if (pendingContacts && pendingContacts.length > 0) {
      console.log(`Found ${pendingContacts.length} pending contact messages to retry`);

      for (const contact of pendingContacts) {
        const ok = await forwardContactToHQ({
          first_name: contact.first_name,
          email: contact.email,
          message: contact.message,
        });

        if (ok) {
          await supabase
            .from('feedback')
            .update({
              hq_forwarded: true,
              hq_forwarded_at: new Date().toISOString(),
              hq_retry_count: (contact.hq_retry_count || 0) + 1,
            })
            .eq('id', contact.id);
          contactSucceeded++;
        } else {
          await supabase
            .from('feedback')
            .update({ hq_retry_count: (contact.hq_retry_count || 0) + 1 })
            .eq('id', contact.id);
          contactFailed++;
        }
      }

      console.log(`Contact retry complete: ${contactSucceeded} succeeded, ${contactFailed} failed`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Retry complete',
        quiz: {
          retried: submissionsToRetry.length,
          succeeded,
          failed,
        },
        contact: {
          retried: pendingContacts?.length ?? 0,
          succeeded: contactSucceeded,
          failed: contactFailed,
        },
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
