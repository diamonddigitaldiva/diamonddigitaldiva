import { QuizButton } from "@/components/ui/quiz-button";

interface IntroScreenProps {
  onStart: () => void;
}

export function IntroScreen({ onStart }: IntroScreenProps) {
  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl md:text-4xl font-heading text-primary mb-4">THE MAP™</h1>
      <p className="text-muted-foreground mb-6">
        This is a diagnostic. Answer honestly. Your clarity starts here.
      </p>
      <QuizButton onClick={onStart}>Start</QuizButton>
    </div>
  );
}
