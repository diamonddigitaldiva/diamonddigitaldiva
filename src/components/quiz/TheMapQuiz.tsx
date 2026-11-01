import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IntroScreen } from "./IntroScreen";
import { QuizScreen } from "./QuizScreen";
import { LeadScreen } from "./LeadScreen";
import { ResultScreen, type SaveStatus } from "./ResultScreen";
import { useAssessment } from "@/hooks/useAssessment";
import { sendQuizResultsToWebhook, type QuizResultPayload } from "@/lib/webhook";
import { forwardToHQ } from "@/lib/hqTracking";
import { Signet } from "@/components/brand/Signet";
import { useToast } from "@/hooks/use-toast";
import {
  buildResultV3,
  legacyFieldsV3,
  pruneV3,
  resultSnapshotV3,
  V3_QUESTIONS,
  type V3AnswerValue,
  type V3Answers,
  type V3Result,
} from "@/lib/assessment/v3";
import { clearDraft, loadDraft, saveDraft } from "@/lib/assessment/draft";

type Screen = "intro" | "quiz" | "lead" | "result";

const FIRST_ID = V3_QUESTIONS[0].id;
/** Explicit "try again" presses allowed after a failed save (no automatic resends). */
export const MAX_SAVE_RETRIES = 3;

export function TheMapQuiz() {
  const { questions, isLoading, version } = useAssessment();
  const { toast } = useToast();
  const [screen, setScreen] = useState<Screen>("intro");
  const [currentId, setCurrentId] = useState<string>(FIRST_ID);
  const [answers, setAnswers] = useState<V3Answers>({});
  const [restored, setRestored] = useState(false);
  const [leadData, setLeadData] = useState({ firstName: "", email: "", hubConsent: false });
  const [result, setResult] = useState<V3Result | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("pending");
  const [retriesLeft, setRetriesLeft] = useState(MAX_SAVE_RETRIES);
  const payloadRef = useRef<QuizResultPayload | null>(null);
  const inFlight = useRef(false);

  /** One send at a time. The draft (answers only) is kept until the result is saved. */
  const submitResult = useCallback(async () => {
    const payload = payloadRef.current;
    if (!payload || inFlight.current) return;
    inFlight.current = true;
    setSaveStatus("pending");
    const outcome = await sendQuizResultsToWebhook(payload);
    inFlight.current = false;
    if (outcome.saved) {
      setSaveStatus(
        outcome.keptPrivate ? "saved_private" : outcome.delivered ? "saved" : outcome.queued ? "saved_queued" : "saved_undelivered"
      );
    } else if (outcome.delivered) {
      setSaveStatus("received");
    } else {
      setSaveStatus("failed");
      return;
    }
    clearDraft();
  }, []);

  const handleRetrySave = () => {
    if (saveStatus !== "failed" || retriesLeft <= 0 || inFlight.current) return;
    setRetriesLeft((n) => n - 1);
    void submitResult();
  };

  // Restore an in-progress draft (answers only, never name/email).
  useEffect(() => {
    const d = loadDraft();
    if (d && Object.keys(d.answers).length) {
      setAnswers(d.answers);
      setCurrentId(d.currentId);
      setScreen(d.screen);
      setRestored(true);
    }
  }, []);

  const visible = useMemo(() => questions.filter((q) => !q.showIf || q.showIf(answers)), [questions, answers]);

  // If the current question became hidden, move to the next visible one in order.
  const current = useMemo(() => {
    const hit = visible.find((q) => q.id === currentId);
    if (hit) return hit;
    const order = V3_QUESTIONS.findIndex((q) => q.id === currentId);
    return visible.find((q) => V3_QUESTIONS.findIndex((x) => x.id === q.id) > order) ?? visible[visible.length - 1];
  }, [visible, currentId]);
  const position = visible.findIndex((q) => q.id === current?.id);

  useEffect(() => {
    if (screen === "quiz" || screen === "lead") saveDraft(answers, current?.id ?? FIRST_ID, screen);
  }, [answers, current, screen]);

  const handleStart = () => {
    setScreen("quiz");
    setCurrentId(FIRST_ID);
  };

  const handleStartOver = () => {
    clearDraft();
    setAnswers({});
    setRestored(false);
    setCurrentId(FIRST_ID);
    setScreen("quiz");
  };

  const handleChange = (key: string, value: V3AnswerValue | undefined) => {
    setAnswers((prev) => {
      const next: V3Answers = { ...prev };
      if (value === undefined) delete next[key];
      else next[key] = value;
      // Changing an earlier answer can hide later questions: drop their stale answers.
      return pruneV3(next);
    });
  };

  const handleBack = () => {
    setRestored(false);
    if (position > 0) setCurrentId(visible[position - 1].id);
  };
  const handleNext = () => {
    setRestored(false);
    if (position < visible.length - 1) setCurrentId(visible[position + 1].id);
    else setScreen("lead");
  };
  const handleLeadBack = () => {
    setScreen("quiz");
    setCurrentId(visible[visible.length - 1].id);
  };

  const handleLeadSubmit = (firstName: string, email: string, hubConsent: boolean, marketingConsent = false) => {
    // Ignore repeat presses while a submission is already being sent.
    if (inFlight.current || payloadRef.current) return;
    const built = buildResultV3(answers);
    if (!built.ok) {
      // Never show a result from incomplete answers. Send them back to the first gap.
      const gaps = new Set([...built.missing, ...built.invalid]);
      const first = visible.find((q) => gaps.has(q.id) || (q.sideText && gaps.has(q.sideText.key)));
      toast({
        title: "One answer needs attention",
        description: "Please answer every required question so your result reflects you.",
        variant: "destructive",
      });
      setScreen("quiz");
      if (first) setCurrentId(first.id);
      return;
    }

    const r = built.result;
    setLeadData({ firstName, email, hubConsent });
    setResult(r);

    // Legacy-compatible fields keep their names/types; v3 data is versioned and
    // additive. The server re-derives the v3 result from the answers.
    payloadRef.current = {
      firstName,
      email,
      ...legacyFieldsV3(r),
      timestamp: new Date().toISOString(),
      source: window.location.origin,
      assessmentVersion: version,
      answers: r.answers,
      result: resultSnapshotV3(r),
      // Explicit boolean; the server records time/source/version itself.
      marketingConsent: marketingConsent === true,
    };
    setRetriesLeft(MAX_SAVE_RETRIES);
    void submitResult();

    forwardToHQ({
      type: "quiz_completed",
      primary_stage: r.primary.id,
      secondary_stage: r.alternate?.id ?? null,
      assessment_version: version,
    });

    setRestored(false);
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

      {isHero ? (
        <main className="flex-1 w-full">
          <IntroScreen onStart={handleStart} />
        </main>
      ) : (
        <main className="flex-1 w-full mx-auto px-4 sm:px-6 py-10 md:py-20 max-w-2xl">
          <div className="quiz-card !px-5 !py-8 sm:!p-8 md:!p-12">
            {screen === "quiz" && current && (
              <QuizScreen
                key={current.id}
                question={current}
                position={position + 1}
                total={visible.length}
                answers={answers}
                onChange={handleChange}
                onBack={handleBack}
                onNext={handleNext}
                canGoBack={position > 0}
                isLast={position === visible.length - 1}
                restored={restored}
                onStartOver={handleStartOver}
              />
            )}
            {screen === "lead" && <LeadScreen onBack={handleLeadBack} onSubmit={handleLeadSubmit} />}
            {screen === "result" && result && (
              <ResultScreen
                result={result}
                firstName={leadData.firstName}
                email={leadData.email}
                hubConsent={leadData.hubConsent}
                saveStatus={saveStatus}
                canRetrySave={retriesLeft > 0}
                onRetrySave={handleRetrySave}
              />
            )}
          </div>
        </main>
      )}

      <footer className="border-t border-border/60 py-8">
        <div className="flex flex-col items-center gap-3">
          <Signet size={32} withShadow={false} />
          <span className="wordmark text-[10px] text-charcoal/70">Diamond Digital Diva</span>
        </div>
      </footer>
    </div>
  );
}
