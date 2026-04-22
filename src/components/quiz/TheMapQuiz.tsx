import { useState } from "react";
import { IntroScreen } from "./IntroScreen";
import { QuizScreen } from "./QuizScreen";
import { LeadScreen } from "./LeadScreen";
import { ResultScreen } from "./ResultScreen";
import { computeResults } from "@/lib/quizData";
import { useQuizData } from "@/hooks/useQuizData";
import { sendQuizResultsToWebhook } from "@/lib/webhook";
import { forwardToHQ } from "@/lib/hqTracking";
import { Signet } from "@/components/brand/Signet";

type Screen = "intro" | "quiz" | "lead" | "result";

export function TheMapQuiz() {
  const { questions, stageNames, links, isLoading } = useQuizData();
  const [screen, setScreen] = useState<Screen>("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [leadData, setLeadData] = useState({ firstName: "", email: "", hubConsent: false });
  const [results, setResults] = useState<{ primary: string; secondary: string | null }>({
    primary: "",
    secondary: null,
  });

  const handleStart = () => { setScreen("quiz"); setQuestionIndex(0); };
  const handleSelectAnswer = (key: string) => setAnswers((prev) => ({ ...prev, [questionIndex]: key }));
  const handleBack = () => { if (questionIndex > 0) setQuestionIndex((p) => p - 1); };
  const handleNext = () => {
    if (questionIndex < questions.length - 1) setQuestionIndex((p) => p + 1);
    else setScreen("lead");
  };
  const handleLeadBack = () => { setScreen("quiz"); setQuestionIndex(questions.length - 1); };

  const handleLeadSubmit = async (firstName: string, email: string, hubConsent: boolean) => {
    setLeadData({ firstName, email, hubConsent });
    const computed = computeResults(answers);
    setResults(computed);

    sendQuizResultsToWebhook({
      firstName,
      email,
      primaryStage: stageNames[computed.primary] || computed.primary,
      secondaryStage: computed.secondary ? stageNames[computed.secondary] : null,
      primaryStageUrl: links[computed.primary] || "",
      secondaryStageUrl: computed.secondary ? links[computed.secondary] : null,
      timestamp: new Date().toISOString(),
      source: window.location.origin,
    });

    forwardToHQ({
      type: "quiz_completed",
      primary_stage: computed.primary,
      secondary_stage: computed.secondary,
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
          <IntroScreen onStart={handleStart} />
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
            {screen === "result" && (
              <ResultScreen
                primaryStage={results.primary}
                secondaryStage={results.secondary}
                firstName={leadData.firstName}
                email={leadData.email}
                hubConsent={leadData.hubConsent}
                stageNames={stageNames}
                links={links}
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
