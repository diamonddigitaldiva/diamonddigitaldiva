import { useState } from "react";
import { QuizButton, quizButtonClasses } from "@/components/ui/quiz-button";
import { FeedbackForm } from "./FeedbackForm";
import { ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { forwardToHQ } from "@/lib/hqTracking";
import { createCreatorAccessHubHandoff, CREATOR_ACCESS_HUB_URL } from "@/lib/handoff";
import type { AssessmentResult } from "@/lib/assessment";

interface ResultScreenProps {
  result: AssessmentResult;
  firstName: string;
  email: string;
  hubConsent: boolean;
}

type HubStatus =
  | { kind: "idle" }
  | { kind: "attached" }
  | { kind: "not_attached" }
  | { kind: "blocked"; url: string };

export function ResultScreen({ result, firstName, email, hubConsent }: ResultScreenProps) {
  const [hubLoading, setHubLoading] = useState(false);
  const [hubStatus, setHubStatus] = useState<HubStatus>({ kind: "idle" });

  /** Click tracking without personal data. */
  const trackClick = (linkName: string, url: string) => {
    supabase
      .from("link_clicks")
      .insert({
        link_name: linkName,
        link_url: url,
        primary_stage: result.priority,
        secondary_stage: result.avenue,
        source: "map-diagnostic",
        hub_consent: hubConsent,
        assessment_version: result.version,
      })
      .then(({ error }) => {
        if (error) console.error("Click tracking failed");
      });
    forwardToHQ({
      type: "link_click",
      link_name: linkName,
      link_url: url,
      primary_stage: result.priority,
      secondary_stage: result.avenue,
      assessment_version: result.version,
    });
  };

  const handleHubClick = async () => {
    if (hubLoading || !hubConsent) return;
    setHubLoading(true);

    // Open the tab synchronously so popup blockers allow it, then point it at
    // the handoff URL once the session exists.
    const win = window.open("", "_blank");
    if (win) {
      try { win.opener = null; } catch { /* ignore */ }
    }

    const { url, attached } = await createCreatorAccessHubHandoff({
      firstName,
      email,
      primaryStage: result.priority,
      primaryStageName: result.priorityLabel,
      primaryStageUrl: result.creatorPath?.url ?? null,
      secondaryStage: result.avenue,
      secondaryStageName: result.avenue ? result.avenueLabel : null,
      secondaryStageUrl: null,
      assessmentVersion: result.version,
    });

    // The handoff consent was given, so name/email go on the click record as before.
    supabase.from("link_clicks").insert({
      link_name: "creator_access_hub",
      link_url: CREATOR_ACCESS_HUB_URL,
      primary_stage: result.priority,
      secondary_stage: result.avenue,
      email,
      first_name: firstName,
      source: "map-diagnostic",
      hub_consent: hubConsent,
      assessment_version: result.version,
    }).then(({ error }) => {
      if (error) console.error("Click tracking failed");
    });
    forwardToHQ({
      type: "link_click",
      link_name: "creator_access_hub",
      link_url: CREATOR_ACCESS_HUB_URL,
      primary_stage: result.priority,
      secondary_stage: result.avenue,
      hub_consent: hubConsent,
      assessment_version: result.version,
    });

    if (win && !win.closed) {
      win.location.href = url;
      setHubStatus(attached ? { kind: "attached" } : { kind: "not_attached" });
    } else {
      setHubStatus({ kind: "blocked", url });
    }
    setHubLoading(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center">
        <div className="eyebrow mb-3">Your MAP</div>
        <h2 className="text-3xl md:text-4xl font-heading text-charcoal mb-2">
          {firstName}, here's your map
        </h2>
        <p className="text-charcoal/70 text-[15px] mb-8">
          Based on your answers, here's where to focus first.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        <div className="p-7 bg-gradient-to-br from-true-black to-charcoal rounded-sm shadow-editorial border border-gold/40 text-center">
          <div className="eyebrow text-gold mb-3">Your priority right now</div>
          <div className="font-heading text-2xl md:text-3xl text-pearl" data-testid="priority-label">
            {result.priorityLabel}
          </div>
          <div className="text-pearl/75 text-[13px] mt-3">
            Stage: {result.stageLabel} · Avenue: {result.avenueLabel}
          </div>
        </div>

        <section className="p-5 bg-ivory rounded-sm border border-amethyst/30" aria-labelledby="why-heading">
          <h3 id="why-heading" className="eyebrow text-amethyst mb-3">Why this comes first</h3>
          <ul className="space-y-2 text-[14px] text-charcoal leading-relaxed list-disc pl-5">
            {result.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {result.notes.length > 0 && (
            <div className="mt-4 space-y-2">
              {result.notes.map((n) => (
                <p key={n} className="text-[13px] text-charcoal/75 italic leading-relaxed">{n}</p>
              ))}
            </div>
          )}
        </section>

        <section className="p-5 rounded-sm border-2 border-amethyst bg-pearl" aria-labelledby="action-heading">
          <h3 id="action-heading" className="eyebrow text-amethyst mb-2">Your next action</h3>
          <p className="text-[15px] text-charcoal leading-relaxed" data-testid="immediate-action">
            {result.immediateAction}
          </p>
        </section>

        <section className="p-5 rounded-sm border border-border bg-pearl" aria-labelledby="plan-heading">
          <h3 id="plan-heading" className="eyebrow text-amethyst mb-1">Your short plan</h3>
          <p className="text-[13px] text-charcoal/70 mb-3">{result.plan.horizon}</p>
          <ol className="space-y-2 text-[14px] text-charcoal leading-relaxed list-decimal pl-5">
            {result.plan.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          {result.plan.note && (
            <p className="text-[13px] text-charcoal/75 mt-3">{result.plan.note}</p>
          )}
        </section>
      </div>

      <div className="flex flex-col gap-3">
        {result.creatorPath && (
          <a
            href={result.creatorPath.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackClick(`creator_path:${result.creatorPath!.slug}`, result.creatorPath!.url)}
            className={quizButtonClasses("outline", "w-full")}
          >
            Explore the {result.creatorPath.label} path
          </a>
        )}

        {hubConsent ? (
          <QuizButton
            type="button"
            variant="ghost"
            onClick={handleHubClick}
            disabled={hubLoading}
            className="w-full"
          >
            {hubLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Preparing your handoff…
              </span>
            ) : (
              "Continue to the Creator Access Hub with my results"
            )}
          </QuizButton>
        ) : (
          <>
            <a
              href={CREATOR_ACCESS_HUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick("cah_browse", CREATOR_ACCESS_HUB_URL)}
              className={quizButtonClasses("ghost", "w-full")}
            >
              Browse the Creator Access Hub
            </a>
            <p className="text-[11px] text-charcoal/60 text-center -mt-1">
              You chose not to share your details, so the Hub opens without your results.
            </p>
          </>
        )}

        <div aria-live="polite" className="text-[12px] text-charcoal/75 text-center min-h-[1em]">
          {hubStatus.kind === "attached" && "The Hub opened in a new tab with your results attached."}
          {hubStatus.kind === "not_attached" &&
            "We couldn't attach your results this time, so the Hub opened without them. Your results are still here."}
          {hubStatus.kind === "blocked" && (
            <>
              Your browser blocked the new tab.{" "}
              <a href={hubStatus.url} target="_blank" rel="noopener noreferrer" className="underline text-amethyst">
                Open the Creator Access Hub
              </a>
              .
            </>
          )}
        </div>
      </div>

      <section className="mt-10 pt-8 border-t border-border" aria-labelledby="resources-heading">
        <h3 id="resources-heading" className="text-lg font-heading text-charcoal mb-1">
          Optional resources
        </h3>
        <p className="text-sm text-muted-foreground mb-5" data-testid="resources-note">
          {result.resourcesNote}
        </p>
        {result.resources.length > 0 && (
          <div className="space-y-3">
            {result.resources.map((product) => (
              <a
                key={product.id}
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick(`resource:${product.id}`, product.url)}
                data-resource-id={product.id}
                className="block p-4 rounded-sm border border-border bg-pearl hover:border-amethyst hover:shadow-soft transition-all text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-heading text-sm text-charcoal">{product.name}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">{product.summary}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" aria-hidden="true" />
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground mt-8 text-center">
        This page is your full result. Save it or take a screenshot before you leave.
      </p>

      <FeedbackForm email={email} firstName={firstName} />
    </div>
  );
}
