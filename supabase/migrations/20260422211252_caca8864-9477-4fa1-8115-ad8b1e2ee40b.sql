ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS hq_task_id text,
  ADD COLUMN IF NOT EXISTS hq_escalation_task_id text,
  ADD COLUMN IF NOT EXISTS hq_response jsonb;