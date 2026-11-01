-- Lets one retry run skip rows it already attempted, so a released (failed)
-- row is tried at most once per run. Replaces the unused 3-arg version
-- created moments earlier (avoids ambiguous overloads).
DROP FUNCTION IF EXISTS public.claim_quiz_submission_for_retry(integer, integer, integer);

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
            ORDER BY s.created_at
            LIMIT 1
            FOR UPDATE SKIP LOCKED
         )
     AND q.webhook_sent = false
     AND (q.webhook_inflight_until IS NULL OR q.webhook_inflight_until < now())
  RETURNING q.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_quiz_submission_for_retry(uuid[], integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_quiz_submission_for_retry(uuid[], integer, integer, integer) TO service_role;