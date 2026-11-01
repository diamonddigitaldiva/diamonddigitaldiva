-- Additive: a delivery lock for quiz submissions so the initial send and
-- overlapping retry runs never post the same row at the same time.
ALTER TABLE public.quiz_submissions
  ADD COLUMN IF NOT EXISTS webhook_inflight_until timestamptz;

COMMENT ON COLUMN public.quiz_submissions.webhook_inflight_until IS
  'Delivery lock: while in the future, the row is being sent by send-webhook or retry-webhooks and must not be claimed again.';

CREATE INDEX IF NOT EXISTS quiz_submissions_unsent_idx
  ON public.quiz_submissions (created_at)
  WHERE webhook_sent = false;

-- Atomically claims ONE unsent row for a retry (skips rows locked by another
-- runner). Hard cap of 10 retry attempts and a minimum 5-minute age.
CREATE OR REPLACE FUNCTION public.claim_quiz_submission_for_retry(
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
            ORDER BY s.created_at
            LIMIT 1
            FOR UPDATE SKIP LOCKED
         )
     AND q.webhook_sent = false
     AND (q.webhook_inflight_until IS NULL OR q.webhook_inflight_until < now())
  RETURNING q.*;
END;
$$;

-- Records the outcome of one retry attempt and releases the lock. Counts the
-- attempt atomically (no lost updates between runners).
CREATE OR REPLACE FUNCTION public.finish_quiz_submission_retry(_id uuid, _delivered boolean)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.quiz_submissions
     SET retry_count = retry_count + 1,
         webhook_inflight_until = NULL,
         webhook_sent = webhook_sent OR COALESCE(_delivered, false),
         webhook_sent_at = CASE WHEN COALESCE(_delivered, false) THEN now() ELSE webhook_sent_at END
   WHERE id = _id;
$$;

REVOKE ALL ON FUNCTION public.claim_quiz_submission_for_retry(integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_quiz_submission_retry(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_quiz_submission_for_retry(integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_quiz_submission_retry(uuid, boolean) TO service_role;