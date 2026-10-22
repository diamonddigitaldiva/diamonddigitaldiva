-- MAP v2 assessment: additive, non-destructive versioning.
-- Existing rows keep NULL assessment_version, meaning legacy v1 (product-letter tally).

ALTER TABLE public.quiz_submissions
  ADD COLUMN IF NOT EXISTS assessment_version text,
  ADD COLUMN IF NOT EXISTS answers jsonb,
  ADD COLUMN IF NOT EXISTS result jsonb;

ALTER TABLE public.quiz_submissions
  ADD CONSTRAINT quiz_submissions_assessment_version_len
  CHECK (assessment_version IS NULL OR length(assessment_version) <= 40);

COMMENT ON COLUMN public.quiz_submissions.assessment_version IS 'NULL = legacy v1 (letter-to-product tally). Never reinterpret legacy rows under newer definitions.';
COMMENT ON COLUMN public.quiz_submissions.answers IS 'Versioned answers keyed by stable question ID -> option ID. NULL for legacy v1 rows (answers were never stored).';
COMMENT ON COLUMN public.quiz_submissions.result IS 'Versioned computed result snapshot (priority, avenue, stage, resource IDs). NULL for legacy v1 rows.';

ALTER TABLE public.link_clicks
  ADD COLUMN IF NOT EXISTS assessment_version text;
ALTER TABLE public.link_clicks
  ADD CONSTRAINT link_clicks_assessment_version_len
  CHECK (assessment_version IS NULL OR length(assessment_version) <= 40);
COMMENT ON COLUMN public.link_clicks.assessment_version IS 'NULL = legacy v1 click. For v2+, primary_stage holds the priority ID and secondary_stage the avenue ID.';

ALTER TABLE public.handoff_sessions
  ADD COLUMN IF NOT EXISTS assessment_version text;
ALTER TABLE public.handoff_sessions
  ADD CONSTRAINT handoff_sessions_assessment_version_len
  CHECK (assessment_version IS NULL OR length(assessment_version) <= 40);
COMMENT ON COLUMN public.handoff_sessions.assessment_version IS 'NULL = legacy v1 handoff (primary_stage is a product code). For v2+, primary_stage is a priority ID, not a product.';

-- Admin-editable wording for versioned assessments. Structure, IDs and scoring stay in code.
CREATE TABLE public.assessment_text_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version text NOT NULL,
  item_key text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assessment_text_overrides_unique UNIQUE (assessment_version, item_key),
  CONSTRAINT assessment_text_overrides_text_len CHECK (length(btrim(text)) BETWEEN 1 AND 300),
  CONSTRAINT assessment_text_overrides_key_len CHECK (length(item_key) BETWEEN 1 AND 80),
  CONSTRAINT assessment_text_overrides_version_len CHECK (length(assessment_version) BETWEEN 1 AND 40)
);

GRANT SELECT ON public.assessment_text_overrides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_text_overrides TO authenticated;
GRANT ALL ON public.assessment_text_overrides TO service_role;

ALTER TABLE public.assessment_text_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read assessment wording"
  ON public.assessment_text_overrides FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage assessment wording"
  ON public.assessment_text_overrides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_assessment_text_overrides_updated_at
  BEFORE UPDATE ON public.assessment_text_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.quiz_questions IS 'LEGACY v1 question content. Not used by the live v2 assessment; kept for record and old-version access.';
COMMENT ON TABLE public.stage_links IS 'LEGACY v1 product-stage links. Not used by v2 recommendations; kept for record.';