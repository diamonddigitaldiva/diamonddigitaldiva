import { QuizButton } from "@/components/ui/quiz-button";
import { cn } from "@/lib/utils";

interface Question {
  text: string;
  options: Record<string, string>;
}

interface QuizScreenProps {
  questionIndex: number;
  questions: Question[];
  answers: Record<number, string>;
  onSelectAnswer: (key: string) => void;
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
  const selectedAnswer = answers[questionIndex];

  if (!question) return null;

  return (
    <div className="animate-fade-in">
      {/* Progress */}
      <div className="flex items-center justify-between mb-3">
        <span className="eyebrow text-charcoal/60">
          Question {questionIndex + 1} of {questions.length}
        </span>
        <span className="eyebrow text-amethyst">{Math.round(progress)}%</span>
      </div>
      <div className="h-[3px] bg-border rounded-full overflow-hidden mb-8">
        <div
          className="h-full bg-amethyst transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <h2 className="font-heading text-2xl md:text-3xl text-charcoal mb-8 leading-tight">
        {question.text}
      </h2>

      <div className="flex flex-col gap-3 mb-8">
        {Object.entries(question.options).map(([key, value]) => (
          <div
            key={key}
            onClick={() => onSelectAnswer(key)}
            className={cn("quiz-option", selectedAnswer === key && "selected")}
          >
            <div className="text-[14px] text-charcoal leading-relaxed">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-between gap-3">
        <QuizButton variant="ghost" onClick={onBack} disabled={questionIndex === 0}>
          Back
        </QuizButton>
        <QuizButton onClick={onNext} disabled={!selectedAnswer}>
          Next
        </QuizButton>
      </div>
    </div>
  );
}
