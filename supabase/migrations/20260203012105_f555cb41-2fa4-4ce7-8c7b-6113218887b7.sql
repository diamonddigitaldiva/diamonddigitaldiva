-- Create feedback table
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  message TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can submit feedback (public form)
CREATE POLICY "Anyone can submit feedback"
ON public.feedback
FOR INSERT
WITH CHECK (true);

-- Only admins can view feedback
CREATE POLICY "Admins can view feedback"
ON public.feedback
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete feedback
CREATE POLICY "Admins can delete feedback"
ON public.feedback
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));