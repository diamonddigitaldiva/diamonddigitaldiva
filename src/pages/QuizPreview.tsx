import { IntroScreen } from "@/components/quiz/IntroScreen";
import { QuizScreen } from "@/components/quiz/QuizScreen";
import { LeadScreen } from "@/components/quiz/LeadScreen";
import { ResultScreen } from "@/components/quiz/ResultScreen";
import { useAssessment } from "@/hooks/useAssessment";
import { buildResultV3, type V3Answers } from "@/lib/assessment/v3";

const SAMPLE_ANSWERS: V3Answers = {
  m3_where: "where_inconsistent",
  m3_help: ["help_improve", "help_add_stream"],
  m3_interests: ["int_digital_products", "int_publishing"],
  m3_bring: ["bring_knowledge", "bring_offer"],
  m3_working_on: ["work_products"],
  m3_obstacle: "obst_explain",
  m3_working: ["works_engage", "works_sales"],
  m3_comfort: {
    cw_camera: "cmf_avoid",
    cw_voice: "cmf_open",
    cw_avatar: "cmf_open",
    cw_faceless: "cmf_comfortable",
    cw_messages: "cmf_comfortable",
    cw_outreach: "cmf_open",
  },
  m3_time: "time3_3_5",
  m3_device: "dev_windows",
  m3_budget: "budget_100",
  m3_support: ["sup_guide"],
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

  const sample = buildResultV3(SAMPLE_ANSWERS);
  const matrix = questions.find((q) => q.kind === "matrix") ?? questions[0];

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
            <h2 className="text-xl font-heading text-charcoal text-center">2. Question Screen (comfort rows)</h2>
            <div className="quiz-card">
              <QuizScreen
                question={matrix}
                position={9}
                total={14}
                answers={SAMPLE_ANSWERS}
                onChange={() => {}}
                onBack={() => {}}
                onNext={() => {}}
                canGoBack
                isLast={false}
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
