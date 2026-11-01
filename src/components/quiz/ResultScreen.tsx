import { useState } from "react";
import { QuizButton, quizButtonClasses } from "@/components/ui/quiz-button";
import { FeedbackForm } from "./FeedbackForm";
import { ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { forwardToHQ } from "@/lib/hqTracking";
import { createCreatorAccessHubHandoff, CREATOR_ACCESS_HUB_URL } from "@/lib/handoff";
import type { V3Focus, V3Result } from "@/lib/assessment/v3";

/**
 * What actually happened to the submission. Never claims an email was sent:
 * whether the CRM sends one is not verified from this app.
 */
export type SaveStatus = "pending" | "saved" | "saved_queued" | "saved_undelivered" | "received" | "failed";

interface ResultScreenProps {
  result: V3Result;
  firstName: string;
  email: string;
  hubConsent: boolean;
  saveStatus?: SaveStatus;
  canRetrySave?: boolean;
  onRetrySave?: () => void;
}

const SAVE_MESSAGE: Record<Exclude<SaveStatus, "failed">, string> = {
  pending: "Saving your result…",
  saved: "Your result has been saved.",
  saved_queued: "Your result has been saved. Passing it on to our team is delayed and will be retried automatically.",
  saved_undelivered: "Your result has been saved. It hasn't been passed on to our team yet.",
  received: "Your result has been received.",
};

type HubStatus =
  | { kind: "idle" }
  | { kind: "attached" }
  | { kind: "not_attached" }
  | { kind: "blocked"; url: string };

const ROLE_HEADING: Record<V3Focus["role"], string> = {
  start: "Your strongest starting point",
  improve: "What to improve first",
  expand: "A new income stream to consider",
  pivot: "A different direction to explore",
};

const ALT_HEADING: Record<V3Focus["role"], string> = {
  start: "Also a good fit",
  improve: "Also worth improving",
  expand: "When you're ready to add something",
  pivot: "Also worth exploring",
};

export function ResultScreen({
  result,
  firstName,
  email,
  hubConsent,
  saveStatus = "saved",
  canRetrySave = false,
  onRetrySave,
}: ResultScreenProps) {
  const [hubLoading, setHubLoading] = useState(false);
  const [hubStatus, setHubStatus] = useState<HubStatus>({ kind: "idle" });
  const { primary, alternate } = result;

  /** Click tracking without personal data. */
  const trackClick = (linkName: string, url: string) => {
    supabase
      .from("link_clicks")
      .insert({
        link_name: linkName,
        link_url: url,
        primary_stage: primary.id,
        secondary_stage: alternate?.id ?? null,
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
      primary_stage: primary.id,
      secondary_stage: alternate?.id ?? null,
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
      try {
        win.opener = null;
      } catch {
        /* ignore */
      }
    }

    const { url, attached } = await createCreatorAccessHubHandoff({
      firstName,
      email,
      primaryStage: primary.id,
      primaryStageName: primary.label,
      primaryStageUrl: primary.creatorPath?.url ?? null,
      secondaryStage: alternate?.id ?? null,
      secondaryStageName: alternate?.label ?? null,
      secondaryStageUrl: null,
      assessmentVersion: result.version,
    });

    // Handoff consent was given, so name/email go on the click record as before.
    supabase
      .from("link_clicks")
      .insert({
        link_name: "creator_access_hub",
        link_url: CREATOR_ACCESS_HUB_URL,
        primary_stage: primary.id,
        secondary_stage: alternate?.id ?? null,
        email,
        first_name: firstName,
        source: "map-diagnostic",
        hub_consent: hubConsent,
        assessment_version: result.version,
      })
      .then(({ error }) => {
        if (error) console.error("Click tracking failed");
      });
    forwardToHQ({
      type: "link_click",
      link_name: "creator_access_hub",
      link_url: CREATOR_ACCESS_HUB_URL,
      primary_stage: primary.id,
      secondary_stage: alternate?.id ?? null,
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
        <h2 className="text-3xl md:text-4xl font-heading text-charcoal mb-2">{firstName}, here's your map</h2>
        <p className="text-charcoal/70 text-[15px] mb-8">
          Based on your answers, here's what fits, what may be missing and a practical next step.
        </p>
      </div>

      <div role="status" aria-live="polite" data-testid="save-status" className="mb-6 text-center">
        {saveStatus === "failed" ? (
          <div className="p-4 rounded-sm border border-destructive/40 bg-pearl text-[13px] text-charcoal leading-relaxed">
            <p>
              We couldn't save your result just now. It's still shown below, so you can read it, save it or take a
              screenshot.
            </p>
            {canRetrySave && onRetrySave ? (
              <QuizButton type="button" variant="ghost" onClick={onRetrySave} className="mt-3">
                Try saving again
              </QuizButton>
            ) : (
              <p className="mt-2 text-charcoal/75">Please save or screenshot this page before you leave.</p>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-charcoal/75 inline-flex items-center gap-2">
            {saveStatus === "pending" && <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />}
            {SAVE_MESSAGE[saveStatus]}
          </p>
        )}
      </div>

      <div className="space-y-4 mb-8">
        <div className="p-7 bg-gradient-to-br from-true-black to-charcoal rounded-sm shadow-editorial border border-gold/40 text-center">
          <div className="eyebrow text-gold mb-3">{ROLE_HEADING[primary.role]}</div>
          <div className="font-heading text-2xl md:text-3xl text-pearl" data-testid="primary-label">
            {primary.label}
          </div>
          {result.uncertain && (
            <div className="text-pearl/80 text-[13px] mt-3" data-testid="uncertain-flag">
              Your answers point in more than one direction, so read this as a strong option, not the only one.
            </div>
          )}
        </div>

        <section className="p-5 bg-ivory rounded-sm border border-amethyst/30" aria-labelledby="why-heading">
          <h3 id="why-heading" className="eyebrow text-amethyst mb-3">
            Why this fits
          </h3>
          <ul className="space-y-2 text-[14px] text-charcoal leading-relaxed list-disc pl-5">
            {primary.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {result.notes.length > 0 && (
            <div className="mt-4 space-y-2">
              {result.notes.map((n) => (
                <p key={n} className="text-[13px] text-charcoal/75 italic leading-relaxed">
                  {n}
                </p>
              ))}
            </div>
          )}
        </section>

        <section className="p-5 rounded-sm border-2 border-amethyst bg-pearl" aria-labelledby="action-heading">
          <h3 id="action-heading" className="eyebrow text-amethyst mb-2">
            Your next step
          </h3>
          <p className="text-[15px] text-charcoal leading-relaxed" data-testid="next-step">
            {primary.nextStep}
          </p>
        </section>

        <section className="p-5 rounded-sm border border-border bg-pearl" aria-labelledby="plan-heading">
          <h3 id="plan-heading" className="eyebrow text-amethyst mb-1">
            Your short plan
          </h3>
          <p className="text-[13px] text-charcoal/70 mb-3">{result.planHorizon}</p>
          <ol className="space-y-2 text-[14px] text-charcoal leading-relaxed list-decimal pl-5">
            {primary.plan.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>

        {alternate && (
          <section className="p-5 rounded-sm border border-border bg-ivory" aria-labelledby="alt-heading" data-testid="alternate">
            <h3 id="alt-heading" className="eyebrow text-amethyst mb-2">
              {ALT_HEADING[alternate.role]}
            </h3>
            <div className="font-heading text-lg text-charcoal mb-1" data-testid="alternate-label">
              {alternate.label}
            </div>
            <p className="text-[14px] text-charcoal/85 leading-relaxed">{alternate.nextStep}</p>
          </section>
        )}

        {result.considerations.length > 0 && (
          <section className="p-5 rounded-sm border border-border bg-pearl" aria-labelledby="consider-heading">
            <h3 id="consider-heading" className="eyebrow text-amethyst mb-2">
              Keep in mind
            </h3>
            <ul className="space-y-2 text-[13px] text-charcoal/85 leading-relaxed list-disc pl-5" data-testid="considerations">
              {result.considerations.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
        )}

        {(result.decisionPoint || result.userNoteAcknowledgement) && (
          <div className="space-y-2">
            {result.decisionPoint && (
              <p className="text-[13px] text-charcoal/80 leading-relaxed" data-testid="decision-point">
                {result.decisionPoint}
              </p>
            )}
            {result.userNoteAcknowledgement && (
              <p className="text-[13px] text-charcoal/80 leading-relaxed">{result.userNoteAcknowledgement}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {primary.creatorPath && (
          <a
            href={primary.creatorPath.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackClick(`creator_path:${primary.creatorPath!.slug}`, primary.creatorPath!.url)}
            className={quizButtonClasses("outline", "w-full")}
          >
            Explore the {primary.creatorPath.label} path
          </a>
        )}

        {hubConsent ? (
          <QuizButton type="button" variant="ghost" onClick={handleHubClick} disabled={hubLoading} className="w-full">
            {hubLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Preparing your handoff…
              </span>
            ) : (
              "Continue to the Creator Access Hub with my results"
            )}
          </QuizButton>
        ) : null}
        {hubConsent && hubStatus.kind === "idle" && (
          <p className="text-[11px] text-charcoal/80 text-center -mt-1">
            Opens in a new tab. If your browser blocks pop-ups, a direct link will appear here.
          </p>
        )}
        {hubConsent ? null : (
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
            <p className="text-[11px] text-charcoal/80 text-center -mt-1">
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
            {result.resources.map((res) => (
              <a
                key={res.id}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick(`resource:${res.id}`, res.url)}
                data-resource-id={res.id}
                className="block p-4 rounded-sm border border-border bg-pearl hover:border-amethyst hover:shadow-soft transition-all text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-heading text-sm text-charcoal">{res.name}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">{res.summary}</p>
                    {res.requirementNote && <p className="text-[12px] text-charcoal/85 mt-1">{res.requirementNote}</p>}
                    <p className="text-[11px] text-charcoal/75 mt-1">
                      {res.priceNote} Opens: {res.destinationLabel}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" aria-hidden="true" />
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground mt-8 text-center">
        This page is your full result. Save it or take a screenshot before you leave. Results are guidance, not a promise of income.
      </p>

      <FeedbackForm email={email} firstName={firstName} />
    </div>
  );
}
