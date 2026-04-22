-- feedback
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
CREATE POLICY "Anyone can submit valid feedback"
ON public.feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(first_name)) > 0
  AND length(btrim(first_name)) <= 100
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(btrim(message)) >= 5
  AND length(message) <= 5000
  AND (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

-- handoff_sessions
DROP POLICY IF EXISTS "Anyone can create a handoff session" ON public.handoff_sessions;
CREATE POLICY "Anyone can create a valid handoff session"
ON public.handoff_sessions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(first_name)) > 0
  AND length(btrim(first_name)) <= 100
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(btrim(primary_stage)) > 0
  AND length(primary_stage) <= 32
);

-- link_clicks
DROP POLICY IF EXISTS "Anyone can record a click" ON public.link_clicks;
CREATE POLICY "Anyone can record a valid click"
ON public.link_clicks
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(link_name)) > 0
  AND length(link_name) <= 200
  AND (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);