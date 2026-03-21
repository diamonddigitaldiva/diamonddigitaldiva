-- Insert new stage links for TDP, AIS, CPM
INSERT INTO public.stage_links (stage_code, stage_name, link_url)
VALUES 
  ('TDP', 'TDP – The Decision Point', 'https://thedecisionpoint-diamonddigitaldiva.lovable.app'),
  ('AIS', 'AIS – AIfluencer Studio', 'https://stan.store/affiliates/32fd0453-745e-46f9-b929-c48aad195517'),
  ('CPM', 'CPM – The Pivot Method', 'https://shop.beacons.ai/diamonddigitaldiva/3fbc71c2-f595-471d-a840-04ea2f5a4204')
ON CONFLICT (stage_code) DO UPDATE SET
  stage_name = EXCLUDED.stage_name,
  link_url = EXCLUDED.link_url,
  updated_at = now();

-- Update all 9 quiz questions to add J, K, L options
UPDATE public.quiz_questions SET options = options || '{"J": "I don''t have a clear roadmap for my business.", "K": "I''m not using AI to grow my influence.", "L": "I need to pivot but don''t know how."}'::jsonb, updated_at = now() WHERE question_index = 0;

UPDATE public.quiz_questions SET options = options || '{"J": "Lost without a business blueprint.", "K": "Like I''m missing out on AI tools.", "L": "Ready for a fresh start but unsure how."}'::jsonb, updated_at = now() WHERE question_index = 1;

UPDATE public.quiz_questions SET options = options || '{"J": "No personalized plan to follow.", "K": "Not leveraging AI for reach and growth.", "L": "I''ve outgrown my current approach."}'::jsonb, updated_at = now() WHERE question_index = 2;

UPDATE public.quiz_questions SET options = options || '{"J": "I need a system to map it all out.", "K": "I want AI to help me reach them.", "L": "My audience has changed and I need to adapt."}'::jsonb, updated_at = now() WHERE question_index = 3;

UPDATE public.quiz_questions SET options = options || '{"J": "I don''t have a blueprint to guide me.", "K": "I''m not using AI to optimize it.", "L": "My old offers don''t fit who I''m becoming."}'::jsonb, updated_at = now() WHERE question_index = 4;

UPDATE public.quiz_questions SET options = options || '{"J": "Having a step-by-step business map.", "K": "Using AI to amplify my influence.", "L": "Reinventing my brand direction."}'::jsonb, updated_at = now() WHERE question_index = 5;

UPDATE public.quiz_questions SET options = options || '{"J": "When I realize I don''t have a plan.", "K": "When I see others using AI and I''m not.", "L": "When my current brand no longer fits."}'::jsonb, updated_at = now() WHERE question_index = 6;

UPDATE public.quiz_questions SET options = options || '{"J": "A personalized business blueprint.", "K": "AI-powered growth strategies.", "L": "A framework for pivoting my brand."}'::jsonb, updated_at = now() WHERE question_index = 7;

UPDATE public.quiz_questions SET options = options || '{"J": "I''ll keep going in circles without a plan.", "K": "I''ll fall behind on AI trends.", "L": "I''ll stay stuck in a brand that no longer fits."}'::jsonb, updated_at = now() WHERE question_index = 8;