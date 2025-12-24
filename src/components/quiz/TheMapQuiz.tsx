import { useState } from "react";
import { IntroScreen } from "./IntroScreen";
import { QuizScreen } from "./QuizScreen";
import { LeadScreen } from "./LeadScreen";
import { ResultScreen } from "./ResultScreen";
import { QUESTIONS, computeResults } from "@/lib/quizData";
import logo from "@/assets/diamond-digital-diva-logo.png";

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
        <header className="mb-6 text-center">
          <img 
            src={logo}
            alt="Diamond Digital Diva logo" 
            className="mx-auto mb-5 max-w-[180px] h-auto"
          />
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

        <footer className="text-center text-sm text-muted-foreground mt-5 opacity-70">
          Diamond Digital Diva
        </footer>
      </div>
    </div>
  );
}
