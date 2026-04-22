-- Add HQ forwarding tracking + entry type to feedback table so contact messages
-- can be durably retried if the HQ webhook is temporarily unavailable.

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS entry_type text NOT NULL DEFAULT 'feedback',
  ADD COLUMN IF NOT EXISTS hq_forwarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hq_forwarded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS hq_retry_count integer NOT NULL DEFAULT 0;

-- Constrain entry_type to known values.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feedback_entry_type_check'
  ) THEN
    ALTER TABLE public.feedback
      ADD CONSTRAINT feedback_entry_type_check
      CHECK (entry_type IN ('feedback', 'contact'));
  END IF;
END $$;

-- Index for retry job lookup of unsent contact messages.
CREATE INDEX IF NOT EXISTS idx_feedback_unsent_contact
  ON public.feedback (created_at)
  WHERE hq_forwarded = false AND entry_type = 'contact';

-- Allow service role (used by edge functions) to update the HQ tracking
-- columns. Public/anon users still cannot update (no UPDATE policy exists).
-- Service role bypasses RLS, so no policy change needed — just documenting.