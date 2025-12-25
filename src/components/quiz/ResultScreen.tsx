import { STAGE_NAMES, LINKS } from "@/lib/quizData";
import { QuizButton } from "@/components/ui/quiz-button";

interface ResultScreenProps {
  primaryStage: string;
  secondaryStage: string | null;
  firstName: string;
}

export function ResultScreen({ primaryStage, secondaryStage, firstName }: ResultScreenProps) {
  return (
    <div className="animate-fade-in text-center">
      <h2 className="text-2xl md:text-3xl font-heading text-charcoal mb-2">Your Results</h2>
      <p className="text-muted-foreground mb-8">
        {firstName}, here's what we found for you.
      </p>

      <div className="space-y-4 mb-8">
        <div className="p-6 bg-gradient-to-br from-charcoal to-charcoal/90 rounded-2xl shadow-lg">
          <div className="text-xs text-white/70 uppercase tracking-wider mb-2">Primary Match</div>
          <div className="font-heading text-xl md:text-2xl text-white">
            {STAGE_NAMES[primaryStage]}
          </div>
        </div>

        {secondaryStage && (
          <div className="p-5 bg-secondary rounded-xl border-2 border-charcoal/20">
            <div className="text-xs text-charcoal/60 uppercase tracking-wider mb-2">Secondary Match</div>
            <div className="font-heading text-lg text-charcoal">
              {STAGE_NAMES[secondaryStage]}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <a
          href={LINKS[primaryStage]}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <QuizButton className="w-full bg-charcoal hover:bg-charcoal/90">
            Go to your next step
          </QuizButton>
        </a>

        {secondaryStage && (
          <a
            href={LINKS[secondaryStage]}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <QuizButton variant="ghost" className="w-full text-charcoal border-charcoal/30 hover:bg-charcoal/5">
              Explore second match
            </QuizButton>
          </a>
        )}

        <a
          href={LINKS.BOUTIQUE}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <QuizButton variant="ghost" className="w-full text-charcoal border-charcoal/30 hover:bg-charcoal/5">
            Browse Boutique
          </QuizButton>
        </a>
      </div>

      <p className="text-xs text-muted-foreground mt-8">
        Check your inbox for more personalized resources.
      </p>
    </div>
  );
}
