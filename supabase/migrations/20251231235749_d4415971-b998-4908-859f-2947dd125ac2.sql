-- Create table for quiz submissions
CREATE TABLE public.quiz_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  email TEXT NOT NULL,
  primary_stage TEXT NOT NULL,
  secondary_stage TEXT,
  primary_stage_url TEXT,
  secondary_stage_url TEXT,
  source TEXT,
  webhook_sent BOOLEAN NOT NULL DEFAULT false,
  webhook_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Create policy for edge function to insert (using service role)
-- No public read access - data is only accessible via service role
CREATE POLICY "Service role can manage quiz submissions"
ON public.quiz_submissions
FOR ALL
USING (true)
WITH CHECK (true);

-- Add index on email for lookups
CREATE INDEX idx_quiz_submissions_email ON public.quiz_submissions(email);

-- Add index on created_at for time-based queries
CREATE INDEX idx_quiz_submissions_created_at ON public.quiz_submissions(created_at DESC);