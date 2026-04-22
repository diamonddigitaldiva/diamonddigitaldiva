import { QuizButton } from "@/components/ui/quiz-button";
import { Signet } from "@/components/brand/Signet";

interface IntroScreenProps {
  onStart: () => void;
}

export function IntroScreen({ onStart }: IntroScreenProps) {
  return (
    <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
      {/* LEFT — Editorial */}
      <div className="text-left">
        <div className="flex items-center gap-4 mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <span className="block w-10 h-px bg-amethyst" />
          <span className="eyebrow">The Diagnostic</span>
        </div>

        <h1
          className="font-heading text-charcoal leading-[0.95] mb-6 animate-fade-up"
          style={{ fontSize: "clamp(4rem, 9vw, 7rem)", animationDelay: "0.2s" }}
        >
          The <em className="not-italic md:italic text-amethyst font-medium">MAP</em>
          <sup className="text-gold text-[0.32em] align-super ml-1 font-normal">™</sup>
        </h1>

        <p
          className="font-heading italic text-charcoal/90 mb-6 animate-fade-up"
          style={{ fontSize: "clamp(1.1rem, 1.6vw, 1.375rem)", animationDelay: "0.3s" }}
        >
          The Messaging &amp; Positioning Diagnostic System for women building a digital empire.
        </p>

        <p
          className="text-charcoal/80 text-[15px] leading-relaxed max-w-[460px] mb-10 animate-fade-up"
          style={{ animationDelay: "0.4s" }}
        >
          Discover your exact stage in the digital journey, unlock your messaging blueprint,
          and receive training designed for the woman you actually are right now — not who anyone
          else thinks you should be.
        </p>

        <div className="flex flex-wrap items-center gap-5 animate-fade-up" style={{ animationDelay: "0.5s" }}>
          <QuizButton onClick={onStart} className="px-11 py-5 tracking-[0.3em]">
            Begin the MAP
          </QuizButton>
          <span className="eyebrow text-charcoal/60 tracking-[0.3em]">
            4 Min · Honest Answers Only
          </span>
        </div>
      </div>

      {/* RIGHT — Diagnostic card */}
      <div className="relative flex items-center justify-center animate-fade-up" style={{ animationDelay: "0.4s" }}>
        {/* Decorative diamond outline */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            width: "min(420px, 90%)",
            aspectRatio: "1 / 1",
            border: "1px solid hsl(var(--gold) / 0.3)",
            transform: "rotate(45deg)",
          }}
        />

        <div
          className="relative bg-ivory w-full max-w-[460px] text-center"
          style={{
            padding: "72px 56px 64px",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div className="flex justify-center mb-6">
            <Signet size={88} animate />
          </div>

          <div className="eyebrow mb-4">Your Diagnostic Awaits</div>

          <h2
            className="font-heading text-true-black mb-4"
            style={{ fontSize: "clamp(2.75rem, 5vw, 4rem)", lineHeight: 1 }}
          >
            The MAP<sup className="text-gold text-[0.32em] align-super font-normal">™</sup>
          </h2>

          <p className="font-heading italic text-charcoal/90 text-[19px] mx-auto mb-8 max-w-[320px]">
            Answer honestly. Your clarity starts here.
          </p>

          <ul className="text-left space-y-3 mb-8">
            {[
              "Identify your exact stage in the digital journey",
              "Receive a custom messaging & positioning blueprint",
              "Unlock training tailored to where you actually are",
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-[13px] text-charcoal/85 leading-relaxed">
                <span
                  aria-hidden
                  className="mt-1.5 flex-shrink-0 bg-gold"
                  style={{ width: 8, height: 8, transform: "rotate(45deg)" }}
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div className="pt-6 border-t border-gold/40 flex items-center justify-around">
            {[
              { n: "12", l: "Questions" },
              { n: "4", l: "Minutes" },
              { n: "∞", l: "Clarity" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="font-heading text-amethyst" style={{ fontSize: "1.625rem", lineHeight: 1 }}>
                  {s.n}
                </div>
                <div className="eyebrow text-charcoal/60 mt-1.5 text-[9px] tracking-[0.3em]">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
