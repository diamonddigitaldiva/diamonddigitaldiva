import { useState } from "react";
import { IntroScreen } from "./IntroScreen";
import { QuizScreen } from "./QuizScreen";
import { LeadScreen } from "./LeadScreen";
import { ResultScreen } from "./ResultScreen";
import { useAssessment } from "@/hooks/useAssessment";
import { sendQuizResultsToWebhook } from "@/lib/webhook";
import { forwardToHQ } from "@/lib/hqTracking";
import { Signet } from "@/components/brand/Signet";
import { useToast } from "@/hooks/use-toast";
import {
  buildResult,
  resultSnapshot,
  CAH_BASE_URL,
  type AssessmentResult,
} from "@/lib/assessment";

type Screen = "intro" | "quiz" | "lead" | "result";

export function TheMapQuiz() {
  const { questions, isLoading, version } = useAssessment();
  const { toast } = useToast();
  const [screen, setScreen] = useState<Screen>("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [leadData, setLeadData] = useState({ firstName: "", email: "", hubConsent: false });
  const [result, setResult] = useState<AssessmentResult | null>(null);

  const currentId = questions[questionIndex]?.id;

  const handleStart = () => { setScreen("quiz"); setQuestionIndex(0); };
  const handleSelectAnswer = (optionId: string) => {
    if (!currentId) return;
    setAnswers((prev) => ({ ...prev, [currentId]: optionId }));
  };
  const handleBack = () => { if (questionIndex > 0) setQuestionIndex((p) => p - 1); };
  const handleNext = () => {
    if (questionIndex < questions.length - 1) setQuestionIndex((p) => p + 1);
    else setScreen("lead");
  };
  const handleLeadBack = () => { setScreen("quiz"); setQuestionIndex(questions.length - 1); };

  const handleLeadSubmit = (firstName: string, email: string, hubConsent: boolean) => {
    const built = buildResult(answers);
    if (!built.ok) {
      // Never show a result from incomplete answers. Send them back to the first gap.
      const firstGap = [...built.missing, ...built.invalid][0];
      const idx = Math.max(0, questions.findIndex((q) => q.id === firstGap));
      toast({
        title: "One answer is missing",
        description: "Please answer every question so your result reflects you.",
        variant: "destructive",
      });
      setScreen("quiz");
      setQuestionIndex(idx);
      return;
    }

    const r = built.result;
    setLeadData({ firstName, email, hubConsent });
    setResult(r);

    // Legacy-compatible fields keep their names. primaryStage now carries the
    // priority label (never a product), and v2 data is versioned and additive.
    sendQuizResultsToWebhook({
      firstName,
      email,
      primaryStage: r.priorityLabel,
      secondaryStage: null,
      primaryStageUrl: r.creatorPath?.url ?? CAH_BASE_URL,
      secondaryStageUrl: null,
      timestamp: new Date().toISOString(),
      source: window.location.origin,
      assessmentVersion: version,
      answers: r.answers,
      result: resultSnapshot(r),
    });

    forwardToHQ({
      type: "quiz_completed",
      primary_stage: r.priority,
      secondary_stage: r.avenue,
      assessment_version: version,
    });

    setScreen("result");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="eyebrow text-charcoal/60">Loading…</p>
      </div>
    );
  }

  const isHero = screen === "intro";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="w-full border-b border-border/60 bg-pearl/70 backdrop-blur-sm">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Signet size={44} />
            <span className="wordmark text-[12px] hidden sm:inline">Diamond Digital Diva</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a
              href="/contact"
              className="text-[11px] uppercase tracking-[0.25em] font-medium text-charcoal hover:text-amethyst transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </nav>

      {/* Main */}
      {isHero ? (
        <main className="flex-1 w-full">
          <IntroScreen onStart={handleStart} questionCount={questions.length} />
        </main>
      ) : (
        <main className="flex-1 w-full mx-auto px-6 py-12 md:py-20 max-w-2xl">
          <div className="quiz-card">
            {screen === "quiz" && (
              <QuizScreen
                questionIndex={questionIndex}
                questions={questions}
                answers={answers}
                onSelectAnswer={handleSelectAnswer}
                onBack={handleBack}
                onNext={handleNext}
              />
            )}
            {screen === "lead" && <LeadScreen onBack={handleLeadBack} onSubmit={handleLeadSubmit} />}
            {screen === "result" && result && (
              <ResultScreen
                result={result}
                firstName={leadData.firstName}
                email={leadData.email}
                hubConsent={leadData.hubConsent}
              />
            )}
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-border/60 py-8">
        <div className="flex flex-col items-center gap-3">
          <Signet size={32} withShadow={false} />
          <span className="wordmark text-[10px] text-charcoal/70">Diamond Digital Diva</span>
        </div>
      </footer>
    </div>
  );
}
