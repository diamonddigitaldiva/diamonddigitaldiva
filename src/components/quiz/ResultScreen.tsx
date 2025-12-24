import { STAGE_NAMES, LINKS } from "@/lib/quizData";
import { QuizButton } from "@/components/ui/quiz-button";

interface ResultScreenProps {
  primaryStage: string;
  secondaryStage: string | null;
  firstName: string;
}

export function ResultScreen({ primaryStage, secondaryStage, firstName }: ResultScreenProps) {
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl mb-2">Your Result</h2>
      <p className="text-muted-foreground mb-6">
        {firstName}, here's what we found for you.
      </p>

      <div className="space-y-3 mb-8">
        <div className="p-4 bg-secondary rounded-xl border border-primary">
          <div className="text-xs text-muted-foreground mb-1">Primary Match</div>
          <div className="font-heading text-lg text-primary">
            {STAGE_NAMES[primaryStage]}
          </div>
        </div>

        {secondaryStage && (
          <div className="p-4 bg-secondary rounded-xl border border-border">
            <div className="text-xs text-muted-foreground mb-1">Second Match</div>
            <div className="font-heading text-lg text-primary">
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
          <QuizButton className="w-full">Go to your next step</QuizButton>
        </a>

        {secondaryStage && (
          <a
            href={LINKS[secondaryStage]}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <QuizButton variant="ghost" className="w-full">
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
          <QuizButton variant="ghost" className="w-full">
            Browse Boutique
          </QuizButton>
        </a>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        Check your inbox for more personalized resources.
      </p>
    </div>
  );
}
