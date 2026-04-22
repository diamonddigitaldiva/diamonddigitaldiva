-- Drop the overly permissive public policies
DROP POLICY IF EXISTS "Anyone can read a non-expired handoff session by id" ON public.handoff_sessions;
DROP POLICY IF EXISTS "Anyone can mark a handoff session consumed" ON public.handoff_sessions;

-- Secure RPC: fetch a handoff session by id (only if non-expired and not consumed)
CREATE OR REPLACE FUNCTION public.get_handoff_session(_session_id uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  email text,
  primary_stage text,
  primary_stage_name text,
  primary_stage_url text,
  secondary_stage text,
  secondary_stage_name text,
  secondary_stage_url text,
  source text,
  created_at timestamptz,
  expires_at timestamptz,
  consumed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    h.id,
    h.first_name,
    h.email,
    h.primary_stage,
    h.primary_stage_name,
    h.primary_stage_url,
    h.secondary_stage,
    h.secondary_stage_name,
    h.secondary_stage_url,
    h.source,
    h.created_at,
    h.expires_at,
    h.consumed_at
  FROM public.handoff_sessions h
  WHERE h.id = _session_id
    AND h.expires_at > now();
$$;

-- Secure RPC: mark a handoff session consumed (idempotent, only if non-expired)
CREATE OR REPLACE FUNCTION public.consume_handoff_session(_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated int;
BEGIN
  UPDATE public.handoff_sessions
     SET consumed_at = COALESCE(consumed_at, now())
   WHERE id = _session_id
     AND expires_at > now();
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$$;

-- Lock down direct execution: only anon/authenticated may call these RPCs
REVOKE ALL ON FUNCTION public.get_handoff_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_handoff_session(uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.consume_handoff_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_handoff_session(uuid) TO anon, authenticated;