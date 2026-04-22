ALTER TABLE public.link_clicks
  ADD COLUMN IF NOT EXISTS hub_consent boolean;