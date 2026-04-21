CREATE TABLE public.link_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_name TEXT NOT NULL,
  link_url TEXT,
  primary_stage TEXT,
  secondary_stage TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a click"
ON public.link_clicks
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view link clicks"
ON public.link_clicks
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_link_clicks_link_name ON public.link_clicks(link_name);
CREATE INDEX idx_link_clicks_created_at ON public.link_clicks(created_at DESC);