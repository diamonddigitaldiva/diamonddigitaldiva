import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QUESTIONS as STATIC_QUESTIONS, STAGE_NAMES as STATIC_STAGE_NAMES, LINKS as STATIC_LINKS } from '@/lib/quizData';

interface Question {
  text: string;
  options: Record<string, string>;
}

interface StageLink {
  stage_code: string;
  stage_name: string;
  link_url: string;
}

interface QuizDataState {
  questions: Question[];
  stageNames: Record<string, string>;
  links: Record<string, string>;
  isLoading: boolean;
}

export function useQuizData() {
  const [state, setState] = useState<QuizDataState>({
    questions: STATIC_QUESTIONS,
    stageNames: STATIC_STAGE_NAMES,
    links: STATIC_LINKS,
    isLoading: true,
  });

  useEffect(() => {
    fetchQuizData();
  }, []);

  const fetchQuizData = async () => {
    try {
      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('question_index, question_text, options')
        .order('question_index', { ascending: true });

      // Fetch stage links
      const { data: linksData, error: linksError } = await supabase
        .from('stage_links')
        .select('stage_code, stage_name, link_url');

      if (questionsError || linksError) {
        console.error('Error fetching quiz data:', questionsError || linksError);
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Transform questions data
      const questions: Question[] = (questionsData || []).map(q => ({
        text: q.question_text,
        options: q.options as Record<string, string>,
      }));

      // Transform links data
      const stageNames: Record<string, string> = {};
      const links: Record<string, string> = {};
      
      (linksData || []).forEach((link: StageLink) => {
        stageNames[link.stage_code] = link.stage_name;
        links[link.stage_code] = link.link_url;
      });

      setState({
        questions: questions.length > 0 ? questions : STATIC_QUESTIONS,
        stageNames: Object.keys(stageNames).length > 0 ? stageNames : STATIC_STAGE_NAMES,
        links: Object.keys(links).length > 0 ? links : STATIC_LINKS,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching quiz data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  return state;
}
