import { QuizButton } from "@/components/ui/quiz-button";
import { FeedbackForm } from "./FeedbackForm";
import { getUpsellsForStage } from "@/lib/quizData";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { forwardToHQ } from "@/lib/hqTracking";

interface ResultScreenProps {
  primaryStage: string;
  secondaryStage: string | null;
  firstName: string;
  email: string;
  stageNames: Record<string, string>;
  links: Record<string, string>;
}

export function ResultScreen({ primaryStage, secondaryStage, firstName, email, stageNames, links }: ResultScreenProps) {
  const upsells = getUpsellsForStage(primaryStage);

  return (
    <div className="animate-fade-in text-center">
      <h2 className="text-2xl md:text-3xl font-heading text-charcoal mb-2">Your Results</h2>
      <p className="text-muted-foreground mb-8">
        {firstName}, here's what we found for you.
      </p>

      <div className="space-y-4 mb-8">
        <div className="p-6 bg-gradient-to-br from-charcoal to-charcoal/90 rounded-2xl shadow-lg border-2 border-soft-blush/50">
          <div className="text-xs text-soft-blush uppercase tracking-wider mb-2">Primary Match</div>
          <div className="font-heading text-xl md:text-2xl text-white">
            {stageNames[primaryStage]}
          </div>
        </div>

        {secondaryStage && (
          <div className="p-5 bg-soft-blush/30 rounded-xl border-2 border-soft-blush">
            <div className="text-xs text-charcoal/70 uppercase tracking-wider mb-2">Secondary Match</div>
            <div className="font-heading text-lg text-charcoal">
              {stageNames[secondaryStage]}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <a
          href={links[primaryStage]}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <QuizButton className="w-full bg-soft-blush hover:bg-soft-blush/80 text-charcoal border-2 border-soft-blush">
            Go to your next step
          </QuizButton>
        </a>

        {secondaryStage && (
          <a
            href={links[secondaryStage]}
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
          href="https://creatoraccesshub.lovable.app"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          onClick={() => {
            supabase.from("link_clicks").insert({
              link_name: "creator_access_hub",
              link_url: "https://creatoraccesshub.lovable.app",
              primary_stage: primaryStage,
              secondary_stage: secondaryStage,
            }).then(({ error }) => {
              if (error) console.error("Click tracking failed:", error);
            });
            forwardToHQ({
              type: "link_click",
              link_name: "creator_access_hub",
              link_url: "https://creatoraccesshub.lovable.app",
              primary_stage: primaryStage,
              secondary_stage: secondaryStage,
            });
          }}
        >
          <QuizButton variant="ghost" className="w-full text-charcoal border-charcoal/30 hover:bg-charcoal/5">
            Visit the Creator Access Hub
          </QuizButton>
        </a>
      </div>

      {/* Upsells Section */}
      {upsells.length > 0 && (
        <div className="mt-10 pt-8 border-t border-border">
          <h3 className="text-lg font-heading text-charcoal mb-1">Also Recommended For You</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Resources hand-picked to complement your results.
          </p>
          <div className="space-y-3">
            {upsells.map((product) => (
              <a
                key={product.url}
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-xl border border-border bg-card hover:border-soft-blush hover:shadow-md transition-all text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {product.label && (
                      <span className="inline-block text-[10px] uppercase tracking-wider font-semibold text-charcoal bg-soft-blush px-2 py-0.5 rounded-full mb-1.5">
                        {product.label}
                      </span>
                    )}
                    <div className="font-heading text-sm text-charcoal">{product.name}</div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{product.description}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-8">
        Check your inbox for more personalized resources.
      </p>

      <FeedbackForm email={email} firstName={firstName} />
    </div>
  );
}
