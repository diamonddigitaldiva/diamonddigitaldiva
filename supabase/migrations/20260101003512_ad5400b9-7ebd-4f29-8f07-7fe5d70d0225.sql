-- Add retry_count column to track webhook retry attempts
ALTER TABLE public.quiz_submissions
ADD COLUMN retry_count integer NOT NULL DEFAULT 0;