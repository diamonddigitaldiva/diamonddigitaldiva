import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MAP_V3_VERSION, V3_QUESTIONS, applyV3TextOverrides, type V3Question } from "@/lib/assessment/v3";

const LOAD_TIMEOUT_MS = 4000;

/**
 * Loads the live v3 assessment. Questions, conditions and scoring come from
 * code; only admin wording overrides for this version are read from the
 * database. Legacy v1 `quiz_questions` rows and v2 overrides are never used
 * here. Any failure falls back to the built-in wording.
 */
export function useAssessment() {
  const [questions, setQuestions] = useState<V3Question[]>(V3_QUESTIONS);
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
          .eq("assessment_version", MAP_V3_VERSION);
        if (!cancelled && !error) {
          setQuestions(applyV3TextOverrides(V3_QUESTIONS, data, MAP_V3_VERSION));
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

  return { questions, isLoading, version: MAP_V3_VERSION };
}
