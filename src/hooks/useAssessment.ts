import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ASSESSMENT_QUESTIONS,
  ASSESSMENT_VERSION,
  applyTextOverrides,
  type AssessmentQuestion,
} from "@/lib/assessment";

const LOAD_TIMEOUT_MS = 4000;

/**
 * Loads the v2 assessment. Questions come from code; only admin wording
 * overrides are read from the database. Legacy v1 `quiz_questions` rows are
 * never used here. Any failure falls back to the built-in wording.
 */
export function useAssessment() {
  const [questions, setQuestions] = useState<AssessmentQuestion[]>(ASSESSMENT_QUESTIONS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setIsLoading(false);
    }, LOAD_TIMEOUT_MS);

    (async () => {
      try {
        const { data, error } = await supabase
          .from("assessment_text_overrides")
          .select("assessment_version, item_key, text")
          .eq("assessment_version", ASSESSMENT_VERSION);
        if (!cancelled && !error) {
          setQuestions(applyTextOverrides(ASSESSMENT_QUESTIONS, data, ASSESSMENT_VERSION));
        }
      } catch {
        // keep defaults
      } finally {
        if (!cancelled) {
          clearTimeout(timeout);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  return { questions, isLoading, version: ASSESSMENT_VERSION };
}
