-- Remove the overly permissive "Service role can manage quiz submissions" policy
-- This policy uses USING (true) which exposes customer data publicly
-- The service role key bypasses RLS anyway, so this policy is redundant and dangerous
DROP POLICY IF EXISTS "Service role can manage quiz submissions" ON public.quiz_submissions;

-- The existing "Admins can view quiz submissions" policy already provides proper access control
-- Only authenticated admins with the admin role can now SELECT from this table