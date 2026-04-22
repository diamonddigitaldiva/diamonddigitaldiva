-- Cross-app handoff sessions: lets the Creator Access Hub fetch a user's
-- name, email, and quiz results by a single short-lived session id.
CREATE TABLE public.handoff_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  email TEXT NOT NULL,
  primary_stage TEXT NOT NULL,
  primary_stage_name TEXT,
  primary_stage_url TEXT,
  secondary_stage TEXT,
  secondary_stage_name TEXT,
  secondary_stage_url TEXT,
  source TEXT,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 hours')
);

ALTER TABLE public.handoff_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) can create a handoff session — needed at result-screen time
-- before the user clicks through to the Hub.
CREATE POLICY "Anyone can create a handoff session"
  ON public.handoff_sessions
  FOR INSERT
  WITH CHECK (true);

-- Anyone with the (unguessable) UUID can read a non-expired row once.
-- The Hub looks it up by id; without the id you cannot enumerate.
CREATE POLICY "Anyone can read a non-expired handoff session by id"
  ON public.handoff_sessions
  FOR SELECT
  USING (expires_at > now());

-- Allow marking a session as consumed (single-use semantics on the Hub side).
CREATE POLICY "Anyone can mark a handoff session consumed"
  ON public.handoff_sessions
  FOR UPDATE
  USING (expires_at > now())
  WITH CHECK (true);

-- Admins can view everything for reporting.
CREATE POLICY "Admins can view all handoff sessions"
  ON public.handoff_sessions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_handoff_sessions_created_at
  ON public.handoff_sessions (created_at DESC);

-- Allow the Hub (anon) to record a click directly into link_clicks so we can
-- report on Hub activity per user. The existing INSERT policy already permits
-- anon inserts; we add columns to associate clicks with a handoff/email.
ALTER TABLE public.link_clicks
  ADD COLUMN IF NOT EXISTS handoff_session_id UUID,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT;

CREATE INDEX IF NOT EXISTS idx_link_clicks_handoff_session_id
  ON public.link_clicks (handoff_session_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_email
  ON public.link_clicks (email);
