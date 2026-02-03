-- Create table for quiz questions
CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_index integer NOT NULL UNIQUE,
  question_text text NOT NULL,
  options jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for stage links
CREATE TABLE public.stage_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_code text NOT NULL UNIQUE,
  stage_name text NOT NULL,
  link_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for quiz_questions
CREATE POLICY "Anyone can read quiz questions"
ON public.quiz_questions
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage quiz questions"
ON public.quiz_questions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for stage_links
CREATE POLICY "Anyone can read stage links"
ON public.stage_links
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage stage links"
ON public.stage_links
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_quiz_questions_updated_at
BEFORE UPDATE ON public.quiz_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stage_links_updated_at
BEFORE UPDATE ON public.stage_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed quiz questions
INSERT INTO public.quiz_questions (question_index, question_text, options) VALUES
(0, 'What''s your biggest struggle with getting your message out?', '{"A": "I don''t know where to start.", "B": "I keep editing myself into something I''m not.", "C": "It doesn''t sound like me at all.", "D": "It feels bland or boring.", "E": "I''m not sure who I''m speaking to.", "F": "I don''t have a consistent content plan.", "G": "I''m creating but it''s not making money.", "H": "I''m doing too much tech just to get seen.", "I": "I don''t feel confident in what I''m sharing."}'),
(1, 'How do you feel when you try to sit down and create content?', '{"A": "Totally overwhelmed.", "B": "Stuck second-guessing my tone.", "C": "Disconnected from my story.", "D": "Unsure what makes me stand out.", "E": "Confused about my audience.", "F": "Scattered with no structure.", "G": "Unclear how this builds income.", "H": "Frustrated with backend systems.", "I": "Like I''m missing the ''special'' spark."}'),
(2, 'What''s blocking your message from being clear and powerful?', '{"A": "Not enough clarity to start.", "B": "Trying to sound right instead of real.", "C": "Not expressing what I''ve actually been through.", "D": "Not knowing how to position what I do.", "E": "No clear vision of who I''m talking to.", "F": "Too many moving pieces to organize.", "G": "Content isn''t converting to sales.", "H": "I''ve built a funnel that doesn''t feel like me.", "I": "I don''t know what makes me magnetic."}'),
(3, 'How well do you know your dream audience?', '{"A": "I have a loose idea but it''s not defined.", "B": "I worry they won''t get me.", "C": "I''m not sharing what they really need to hear.", "D": "I don''t know what they need most.", "E": "I haven''t clarified who they are.", "F": "It''s not guiding how I show up.", "G": "I''m unsure what content they''ll buy from me.", "H": "I''m trying to automate without knowing them.", "I": "I don''t know how to resonate with them."}'),
(4, 'What happens when you try to write an offer?', '{"A": "I don''t start because I overthink.", "B": "It doesn''t sound like something I''d buy.", "C": "I''m not sharing the transformation clearly.", "D": "I can''t find the words to differentiate.", "E": "I''m unsure who I''m writing to.", "F": "It doesn''t fit into any content system.", "G": "It doesn''t lead to actual sales.", "H": "I get stuck setting up the tech behind it.", "I": "It feels like it lacks that secret sauce."}'),
(5, 'What do you wish was easier in your creative process?', '{"A": "Knowing where to begin.", "B": "Letting my real voice lead.", "C": "Turning my story into content.", "D": "Crafting unique messaging.", "E": "Letting my avatar guide me.", "F": "Building a working content plan.", "G": "Creating profitable assets.", "H": "Making tech feel seamless.", "I": "Tapping into my magic consistently."}'),
(6, 'Where do you usually stop or get stuck?', '{"A": "At the very beginning.", "B": "When trying to sound authentic.", "C": "When explaining what I''ve overcome.", "D": "When trying to make my offer stand out.", "E": "When defining my dream client.", "F": "When planning the content journey.", "G": "When turning content into cash.", "H": "When connecting all the tools.", "I": "When I try to bottle my uniqueness."}'),
(7, 'What kind of support would help you most?', '{"A": "Help getting started.", "B": "Voice and style clarity.", "C": "Storytelling frameworks.", "D": "Strong positioning strategy.", "E": "Audience alignment.", "F": "Content structure systems.", "G": "Revenue-driving ideas.", "H": "Backend tech clean-up.", "I": "Uncovering my special edge."}'),
(8, 'What do you secretly fear when it comes to messaging?', '{"A": "I''m not ready to do this.", "B": "I''ll sound like everyone else.", "C": "My story won''t resonate.", "D": "People won''t see my difference.", "E": "I''m unclear who I serve.", "F": "I''ll stay stuck in a cycle of content chaos.", "G": "I''ll never earn from what I create.", "H": "My systems will sabotage my growth.", "I": "I''ll never find the ''thing'' that makes me unforgettable."}');

-- Seed stage links
INSERT INTO public.stage_links (stage_code, stage_name, link_url) VALUES
('CFW', 'CFW – The Start Line', 'https://stan.store/affiliates/c935ed13-9133-43b2-aaed-80ecc046111d'),
('AICA', 'AICA – The Brain (2.0)', 'https://shop.beacons.ai/diamonddigitaldiva/03ce2f96-f277-4ee0-9486-ed56fdcb9554'),
('MPV', 'MPV – Must-Have Production Vault', 'https://shop.beacons.ai/diamonddigitaldiva/fc2e90aa-974a-4250-bba4-4874983c6527'),
('TACM', 'TACM – The Decoder', 'https://stan.store/affiliates/b65c8924-96d7-4b85-bf01-8f7a41c7de7d'),
('ATA', 'ATA – The Engine', 'https://stan.store/affiliates/b42f8d5f-d122-45a2-a8fc-8e5a347b95fe'),
('TSA', 'TSA – The OS', 'https://stan.store/affiliates/b6f875c9-80ff-4073-b7c4-4555497ee91a'),
('DWA', 'DWA – The Business', 'https://go.diamonddigitaldiva.com/dwa'),
('FOC', 'FOC – The Infrastructure', 'https://funnelsofcourse.com/foc-home?am_id=elleni1987'),
('TSS', 'TSS – The Secret Sauce', 'https://shop.beacons.ai/diamonddigitaldiva/4f3e423a-491a-40f2-828b-d46cb1d5abcb'),
('BOUTIQUE', 'The Boutique', 'https://beacons.ai/diamonddigitaldiva');