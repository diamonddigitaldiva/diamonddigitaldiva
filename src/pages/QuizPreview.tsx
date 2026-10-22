import { IntroScreen } from "@/components/quiz/IntroScreen";
import { QuizScreen } from "@/components/quiz/QuizScreen";
import { LeadScreen } from "@/components/quiz/LeadScreen";
import { ResultScreen } from "@/components/quiz/ResultScreen";
import { useAssessment } from "@/hooks/useAssessment";
import { buildResult } from "@/lib/assessment";

const SAMPLE_ANSWERS = {
  q_stage: "stage_launched",
  q_avenue: "avenue_digital_products",
  q_goal: "goal_consistent",
  q_clarity: "clarity_offer",
  q_evidence: "evidence_engagement",
  q_time: "time_3_7",
  q_owned: "owned_product",
  q_support: "support_open",
};

export default function QuizPreview() {
  const { questions, isLoading } = useAssessment();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading preview...</p>
      </div>
    );
  }

  const sample = buildResult(SAMPLE_ANSWERS);

  return (
    <div className="min-h-screen py-8 px-4 bg-background">
      <div className="container max-w-7xl mx-auto space-y-10">
        <h1 className="text-3xl font-heading text-charcoal text-center">Quiz Preview - All Screens</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-heading text-charcoal text-center">1. Intro Screen</h2>
          <div className="max-w-[1200px] mx-auto px-2 py-6 md:px-6 md:py-12">
            <IntroScreen onStart={() => {}} questionCount={questions.length} />
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-xl font-heading text-charcoal text-center">2. Question Screen</h2>
            <div className="quiz-card">
              <QuizScreen
                questionIndex={0}
                questions={questions}
                answers={SAMPLE_ANSWERS}
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
            <h2 className="text-xl font-heading text-charcoal text-center">4. Result Screen (sample answers)</h2>
            <div className="quiz-card max-w-3xl mx-auto">
              {sample.ok && (
                <ResultScreen result={sample.result} firstName="Jane" email="jane@example.com" hubConsent={false} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
