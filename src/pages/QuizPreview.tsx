import { IntroScreen } from "@/components/quiz/IntroScreen";
import { QuizScreen } from "@/components/quiz/QuizScreen";
import { LeadScreen } from "@/components/quiz/LeadScreen";
import { ResultScreen } from "@/components/quiz/ResultScreen";
import { useQuizData } from "@/hooks/useQuizData";

export default function QuizPreview() {
  const { questions, stageNames, links, isLoading } = useQuizData();

  const mockAnswers = { 0: "A", 1: "B", 2: "C" };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading preview...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-background">
      <div className="container max-w-7xl mx-auto space-y-10">
        <h1 className="text-3xl font-heading text-charcoal text-center">Quiz Preview - All Screens</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-heading text-charcoal text-center">1. Intro Screen</h2>
          <div className="max-w-[1200px] mx-auto px-2 py-6 md:px-6 md:py-12">
            <IntroScreen onStart={() => {}} />
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-xl font-heading text-charcoal text-center">2. Quiz Screen</h2>
            <div className="quiz-card">
              <QuizScreen
                questionIndex={0}
                questions={questions}
                answers={mockAnswers}
                onSelectAnswer={() => {}}
                onBack={() => {}}
                onNext={() => {}}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-heading text-charcoal text-center">3. Lead Capture Screen</h2>
            <div className="quiz-card">
              <LeadScreen onBack={() => {}} onSubmit={() => {}} />
            </div>
          </div>

          <div className="space-y-4 md:col-span-2">
            <h2 className="text-xl font-heading text-charcoal text-center">4. Result Screen</h2>
            <div className="quiz-card max-w-3xl mx-auto">
              <ResultScreen
                primaryStage="CFW"
                secondaryStage="AICA"
                firstName="Jane"
                email="jane@example.com"
                stageNames={stageNames}
                links={links}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
