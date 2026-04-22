ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS hq_inflight_until timestamp with time zone;

-- Refresh the partial index so the cron query stays cheap.
DROP INDEX IF EXISTS public.idx_feedback_unsent_contact;
CREATE INDEX idx_feedback_unsent_contact
  ON public.feedback (created_at)
  WHERE hq_forwarded = false AND entry_type = 'contact';