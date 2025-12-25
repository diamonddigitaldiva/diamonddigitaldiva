import { QuizButton } from "@/components/ui/quiz-button";
import { QUESTIONS } from "@/lib/quizData";
import { cn } from "@/lib/utils";

interface QuizScreenProps {
  questionIndex: number;
  answers: Record<number, string>;
  onSelectAnswer: (key: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function QuizScreen({
  questionIndex,
  answers,
  onSelectAnswer,
  onBack,
  onNext,
}: QuizScreenProps) {
  const question = QUESTIONS[questionIndex];
  const progress = ((questionIndex + 1) / QUESTIONS.length) * 100;
  const selectedAnswer = answers[questionIndex];

  return (
    <div className="animate-fade-in">
{/* Progress Bar */}
      <div className="h-2 bg-secondary border border-border rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-charcoal transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <h2 className="text-xl md:text-2xl text-charcoal mb-6">{question.text}</h2>

      {/* Options */}
      <div className="flex flex-col gap-3 mb-6">
        {Object.entries(question.options).map(([key, value]) => (
          <div
            key={key}
            onClick={() => onSelectAnswer(key)}
            className={cn(
              "quiz-option text-charcoal",
              selectedAnswer === key && "selected"
            )}
          >
            <div className="text-sm">{value}</div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-3">
        <QuizButton
          variant="ghost"
          onClick={onBack}
          disabled={questionIndex === 0}
        >
          Back
        </QuizButton>
        <QuizButton onClick={onNext} disabled={!selectedAnswer}>
          Next
        </QuizButton>
      </div>
    </div>
  );
}
