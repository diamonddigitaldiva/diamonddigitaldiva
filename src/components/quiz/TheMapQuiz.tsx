import { useState } from "react";
import { IntroScreen } from "./IntroScreen";
import { QuizScreen } from "./QuizScreen";
import { LeadScreen } from "./LeadScreen";
import { ResultScreen } from "./ResultScreen";
import { QUESTIONS, computeResults } from "@/lib/quizData";

type Screen = "intro" | "quiz" | "lead" | "result";

export function TheMapQuiz() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [leadData, setLeadData] = useState({ firstName: "", email: "" });
  const [results, setResults] = useState<{ primary: string; secondary: string | null }>({
    primary: "",
    secondary: null,
  });

  const handleStart = () => {
    setScreen("quiz");
    setQuestionIndex(0);
  };

  const handleSelectAnswer = (key: string) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: key }));
  };

  const handleBack = () => {
    if (questionIndex > 0) {
      setQuestionIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (questionIndex < QUESTIONS.length - 1) {
      setQuestionIndex((prev) => prev + 1);
    } else {
      setScreen("lead");
    }
  };

  const handleLeadBack = () => {
    setScreen("quiz");
    setQuestionIndex(QUESTIONS.length - 1);
  };

  const handleLeadSubmit = (firstName: string, email: string) => {
    setLeadData({ firstName, email });
    const computed = computeResults(answers);
    setResults(computed);
    setScreen("result");
  };

  return (
    <div className="min-h-screen flex flex-col py-8 px-4">
      <div className="container max-w-2xl mx-auto">
        <header className="mb-6">
          <h1 className="text-4xl md:text-5xl font-heading text-primary tracking-wide">
            THE MAP™
          </h1>
          <p className="text-muted-foreground mt-2">
            This is a diagnostic. Answer honestly.
          </p>
        </header>

        <main className="quiz-card">
          {screen === "intro" && <IntroScreen onStart={handleStart} />}
          
          {screen === "quiz" && (
            <QuizScreen
              questionIndex={questionIndex}
              answers={answers}
              onSelectAnswer={handleSelectAnswer}
              onBack={handleBack}
              onNext={handleNext}
            />
          )}
          
          {screen === "lead" && (
            <LeadScreen onBack={handleLeadBack} onSubmit={handleLeadSubmit} />
          )}
          
          {screen === "result" && (
            <ResultScreen
              primaryStage={results.primary}
              secondaryStage={results.secondary}
              firstName={leadData.firstName}
            />
          )}
        </main>
      </div>
    </div>
  );
}
