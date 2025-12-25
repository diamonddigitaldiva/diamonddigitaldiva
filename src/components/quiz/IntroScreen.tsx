import { QuizButton } from "@/components/ui/quiz-button";

interface IntroScreenProps {
  onStart: () => void;
}

export function IntroScreen({ onStart }: IntroScreenProps) {
  return (
    <div className="animate-fade-in text-center">
      <h1 className="text-3xl md:text-4xl font-heading text-charcoal mb-2">THE MAP™</h1>
      <p className="text-lg text-muted-foreground mb-4">
        The Messaging & Positioning Diagnostic System
      </p>
      <p className="text-muted-foreground mb-4">
        Discover your stage in the digital journey. Unlock your messaging blueprint. Get personalized training designed for exactly where you are.
      </p>
      <p className="text-muted-foreground mb-6">
        Answer honestly. Your clarity starts here.
      </p>
      <QuizButton onClick={onStart}>Start</QuizButton>
    </div>
  );
}
