import { QuizButton } from "@/components/ui/quiz-button";

interface IntroScreenProps {
  onStart: () => void;
}

export function IntroScreen({ onStart }: IntroScreenProps) {
  return (
    <div className="animate-fade-in text-center relative">
      {/* Decorative blush accent */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-soft-blush to-transparent rounded-full" />
      
      <h1 className="text-3xl md:text-4xl font-heading text-charcoal mb-2">THE MAP™</h1>
      <p className="text-lg text-muted-foreground mb-4">
        The Messaging & Positioning Diagnostic System
      </p>
      
      {/* Blush divider */}
      <div className="w-16 h-0.5 bg-soft-blush mx-auto mb-4 rounded-full" />
      
      <p className="text-muted-foreground mb-4">
        Discover your stage in the digital journey. Unlock your messaging blueprint. Get personalized training designed for exactly where you are.
      </p>
      <p className="text-muted-foreground mb-6">
        Answer honestly. Your clarity starts here.
      </p>
      <QuizButton onClick={onStart} className="bg-charcoal hover:bg-charcoal/90 text-white border-2 border-soft-blush">
        Start
      </QuizButton>
    </div>
  );
}
