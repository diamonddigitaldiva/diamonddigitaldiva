import { QuizButton } from "@/components/ui/quiz-button";

interface IntroScreenProps {
  onStart: () => void;
}

export function IntroScreen({ onStart }: IntroScreenProps) {
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl mb-4">Find your stage</h2>
      <p className="text-muted-foreground mb-6">
        Discover where you are on your journey and get personalized guidance.
      </p>
      <QuizButton onClick={onStart}>Start</QuizButton>
    </div>
  );
}
