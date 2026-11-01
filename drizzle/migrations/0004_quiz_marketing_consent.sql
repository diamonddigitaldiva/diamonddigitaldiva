-- Additive, nullable: explicit marketing-email consent for quiz submissions.
-- NULL means unknown (all existing/legacy rows); never treated as opt-in. No backfill.
ALTER TABLE public.quiz_submissions
  ADD COLUMN IF NOT EXISTS marketing_consent boolean,
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_consent_source text,
  ADD COLUMN IF NOT EXISTS marketing_consent_version text,
  ADD COLUMN IF NOT EXISTS crm_forwarding_status text;

COMMENT ON COLUMN public.quiz_submissions.marketing_consent IS
  'Explicit marketing-email consent from the lead form (true/false). NULL = unknown/legacy, never opt-in.';
COMMENT ON COLUMN public.quiz_submissions.marketing_consent_at IS 'Server time the preference was recorded (never client-supplied).';
COMMENT ON COLUMN public.quiz_submissions.marketing_consent_source IS 'Server-set source of the preference, e.g. map-lead-form.';
COMMENT ON COLUMN public.quiz_submissions.marketing_consent_version IS 'Version of the consent wording shown.';
COMMENT ON COLUMN public.quiz_submissions.crm_forwarding_status IS
  'suppressed_no_consent = saved locally only; must never be sent to the external CRM or queued for retry.';

-- Retry claims never pick suppressed rows or v3+ rows without explicit consent.
CREATE OR REPLACE FUNCTION public.claim_quiz_submission_for_retry(
  _exclude uuid[] DEFAULT '{}',
  _older_than_minutes integer DEFAULT 5,
  _max_attempts integer DEFAULT 10,
  _lock_seconds integer DEFAULT 120
)
RETURNS SETOF public.quiz_submissions
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.quiz_submissions q
     SET webhook_inflight_until = now() + make_interval(secs => GREATEST(30, LEAST(COALESCE(_lock_seconds, 120), 600)))
   WHERE q.id = (
           SELECT s.id
             FROM public.quiz_submissions s
            WHERE s.webhook_sent = false
              AND s.retry_count < LEAST(COALESCE(_max_attempts, 10), 10)
              AND s.created_at < now() - make_interval(mins => GREATEST(COALESCE(_older_than_minutes, 5), 5))
              AND (s.webhook_inflight_until IS NULL OR s.webhook_inflight_until < now())
              AND NOT (s.id = ANY (COALESCE(_exclude, '{}')))
              AND s.crm_forwarding_status IS DISTINCT FROM 'suppressed_no_consent'
              AND (s.assessment_version IS NULL OR s.assessment_version NOT LIKE 'map-v3%' OR s.marketing_consent IS TRUE)
            ORDER BY s.created_at
            LIMIT 1
            FOR UPDATE SKIP LOCKED
         )
     AND q.webhook_sent = false
     AND (q.webhook_inflight_until IS NULL OR q.webhook_inflight_until < now())
     AND q.crm_forwarding_status IS DISTINCT FROM 'suppressed_no_consent'
     AND (q.assessment_version IS NULL OR q.assessment_version NOT LIKE 'map-v3%' OR q.marketing_consent IS TRUE)
  RETURNING q.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_quiz_submission_for_retry(uuid[], integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_quiz_submission_for_retry(uuid[], integer, integer, integer) TO service_role;