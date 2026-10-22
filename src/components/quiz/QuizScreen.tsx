import { QuizButton } from "@/components/ui/quiz-button";
import { cn } from "@/lib/utils";
import * as RadioGroup from "@radix-ui/react-radio-group";
import type { AssessmentQuestion } from "@/lib/assessment";

interface QuizScreenProps {
  questionIndex: number;
  questions: AssessmentQuestion[];
  answers: Record<string, string>;
  onSelectAnswer: (optionId: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function QuizScreen({
  questionIndex,
  questions,
  answers,
  onSelectAnswer,
  onBack,
  onNext,
}: QuizScreenProps) {
  const question = questions[questionIndex];
  const progress = ((questionIndex + 1) / questions.length) * 100;

  if (!question) return null;

  const selectedAnswer = answers[question.id];
  const headingId = `quiz-question-${question.id}`;

  return (
    <div className="animate-fade-in">
      {/* Progress */}
      <div className="flex items-center justify-between mb-3">
        <span className="eyebrow text-charcoal/80">
          Question {questionIndex + 1} of {questions.length}
        </span>
        <span className="eyebrow text-amethyst" aria-hidden="true">
          {Math.round(progress)}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Assessment progress"
        aria-valuemin={1}
        aria-valuemax={questions.length}
        aria-valuenow={questionIndex + 1}
        aria-valuetext={`Question ${questionIndex + 1} of ${questions.length}`}
        className="h-[3px] bg-border rounded-full overflow-hidden mb-8"
      >
        <div
          className="h-full bg-amethyst transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Screen-reader announcement of question changes */}
      <p aria-live="polite" className="sr-only">
        Question {questionIndex + 1} of {questions.length}: {question.text}
      </p>

      <h2
        id={headingId}
        className="font-heading text-2xl md:text-3xl text-charcoal mb-8 leading-tight"
      >
        {question.text}
      </h2>

      <RadioGroup.Root
        aria-labelledby={headingId}
        value={selectedAnswer ?? ""}
        onValueChange={onSelectAnswer}
        loop={false}
        className="flex flex-col gap-3 mb-8"
      >
        {question.options.map((option) => (
          <RadioGroup.Item
            key={option.id}
            value={option.id}
            data-option-id={option.id}
            onKeyDown={(e) => {
              // Radix selects on Space; mirror that for Enter.
              if (e.key === "Enter") {
                e.preventDefault();
                onSelectAnswer(option.id);
              }
            }}
            className={cn(
              "quiz-option w-full text-left",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-amethyst focus-visible:ring-offset-2 focus-visible:ring-offset-ivory",
              selectedAnswer === option.id && "selected"
            )}
          >
            <div className="text-[14px] text-charcoal leading-relaxed">{option.label}</div>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>

      <div className="flex justify-between gap-3">
        <QuizButton variant="ghost" onClick={onBack} disabled={questionIndex === 0}>
          Back
        </QuizButton>
        <QuizButton onClick={onNext} disabled={!selectedAnswer}>
          {questionIndex === questions.length - 1 ? "Finish" : "Next"}
        </QuizButton>
      </div>
    </div>
  );
}
