import { IntroScreen } from "@/components/quiz/IntroScreen";
import { QuizScreen } from "@/components/quiz/QuizScreen";
import { LeadScreen } from "@/components/quiz/LeadScreen";
import { ResultScreen } from "@/components/quiz/ResultScreen";
import { useQuizData } from "@/hooks/useQuizData";
import logo from "@/assets/diamond-digital-diva-logo.png";

export default function QuizPreview() {
  const { questions, stageNames, links, isLoading } = useQuizData();
  
  // Mock data for preview
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
      <div className="container max-w-6xl mx-auto">
        <h1 className="text-3xl font-heading text-charcoal text-center mb-8">Quiz Preview - All Screens</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Intro Screen */}
          <div className="space-y-4">
            <h2 className="text-xl font-heading text-charcoal text-center">1. Intro Screen</h2>
            <div className="quiz-card">
              <div className="text-center mb-4">
                <img 
                  src={logo}
                  alt="Diamond Digital Diva logo" 
                  className="mx-auto mb-5 max-w-[220px] h-auto"
                />
              </div>
              <IntroScreen onStart={() => {}} />
            </div>
          </div>

          {/* Quiz Screen */}
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

          {/* Lead Screen */}
          <div className="space-y-4">
            <h2 className="text-xl font-heading text-charcoal text-center">3. Lead Capture Screen</h2>
            <div className="quiz-card">
              <LeadScreen onBack={() => {}} onSubmit={() => {}} />
            </div>
          </div>

          {/* Result Screen */}
          <div className="space-y-4">
            <h2 className="text-xl font-heading text-charcoal text-center">4. Result Screen</h2>
            <div className="quiz-card">
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
