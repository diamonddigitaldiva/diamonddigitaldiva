-- Additive: lets guests create a handoff session and get back ONLY its opaque
-- id, without needing SELECT on handoff_sessions (which stays admin-only).
CREATE OR REPLACE FUNCTION public.create_handoff_session(
  _first_name text,
  _email text,
  _primary_stage text,
  _primary_stage_name text DEFAULT NULL,
  _primary_stage_url text DEFAULT NULL,
  _secondary_stage text DEFAULT NULL,
  _secondary_stage_name text DEFAULT NULL,
  _secondary_stage_url text DEFAULT NULL,
  _assessment_version text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _fn text := btrim(coalesce(_first_name, ''));
  _em text := lower(btrim(coalesce(_email, '')));
  _ps text := btrim(coalesce(_primary_stage, ''));
BEGIN
  IF length(_fn) = 0 OR length(_fn) > 100 THEN
    RAISE EXCEPTION 'invalid first name' USING ERRCODE = '22023';
  END IF;
  IF length(_em) > 255 OR _em !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid email' USING ERRCODE = '22023';
  END IF;
  IF _ps !~ '^[a-z0-9_\-]{1,32}$' THEN
    RAISE EXCEPTION 'invalid primary stage' USING ERRCODE = '22023';
  END IF;
  IF _secondary_stage IS NOT NULL AND _secondary_stage !~ '^[a-z0-9_\-]{1,32}$' THEN
    RAISE EXCEPTION 'invalid secondary stage' USING ERRCODE = '22023';
  END IF;
  IF (_primary_stage_name IS NOT NULL AND length(_primary_stage_name) > 200)
     OR (_secondary_stage_name IS NOT NULL AND length(_secondary_stage_name) > 200) THEN
    RAISE EXCEPTION 'invalid stage name' USING ERRCODE = '22023';
  END IF;
  IF (_primary_stage_url IS NOT NULL AND (length(_primary_stage_url) > 500 OR _primary_stage_url !~ '^https://[^\s?#]+$'))
     OR (_secondary_stage_url IS NOT NULL AND (length(_secondary_stage_url) > 500 OR _secondary_stage_url !~ '^https://[^\s?#]+$')) THEN
    RAISE EXCEPTION 'invalid stage url' USING ERRCODE = '22023';
  END IF;
  IF _assessment_version IS NOT NULL AND _assessment_version !~ '^[a-z0-9][a-z0-9.\-]{0,39}$' THEN
    RAISE EXCEPTION 'invalid assessment version' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.handoff_sessions (
    first_name, email, primary_stage, primary_stage_name, primary_stage_url,
    secondary_stage, secondary_stage_name, secondary_stage_url,
    assessment_version, source
  ) VALUES (
    _fn, _em, _ps, _primary_stage_name, _primary_stage_url,
    _secondary_stage, _secondary_stage_name, _secondary_stage_url,
    _assessment_version, 'map-diagnostic'
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_handoff_session(text, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_handoff_session(text, text, text, text, text, text, text, text, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.create_handoff_session(text, text, text, text, text, text, text, text, text) IS
  'Creates a 2h handoff session (table default TTL) and returns only its opaque id. Guests never get SELECT on handoff_sessions.';