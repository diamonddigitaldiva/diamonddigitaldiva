import { Signet } from "@/components/brand/Signet";

interface IntroScreenProps {
  onStart: () => void;
}

export function IntroScreen({ onStart }: IntroScreenProps) {
  return (
    <div className="intro-scroll">
      {/* SECTION 2 — Hero */}
      <section
        className="text-center mx-auto hero-section intro-snap"
        style={{ maxWidth: 880 }}
      >
        <div className="flex justify-center animate-fade-up" style={{ animationDelay: "0s" }}>
          <Signet size={88} animate />
        </div>

        <div
          className="flex items-center justify-center gap-4 animate-fade-up"
          style={{ marginTop: 40, marginBottom: 28, animationDelay: "0.2s" }}
        >
          <span className="block bg-amethyst" style={{ width: 40, height: 1 }} />
          <span
            className="text-amethyst font-semibold uppercase"
            style={{ fontSize: 10, letterSpacing: "0.4em" }}
          >
            The Diagnostic
          </span>
          <span className="block bg-amethyst" style={{ width: 40, height: 1 }} />
        </div>

        <h1
          className="font-heading text-charcoal animate-fade-up"
          style={{
            fontSize: "clamp(64px, 10vw, 120px)",
            lineHeight: 0.95,
            letterSpacing: "-3px",
            marginBottom: 32,
            animationDelay: "0.3s",
          }}
        >
          The <em className="not-italic md:italic text-amethyst font-medium">MAP</em>
          <sup
            className="text-gold align-super font-normal"
            style={{ fontSize: "0.25em", marginLeft: "0.05em" }}
          >
            ™
          </sup>
        </h1>

        <p
          className="font-heading italic text-charcoal mx-auto animate-fade-up"
          style={{
            fontSize: 24,
            lineHeight: 1.4,
            maxWidth: 560,
            marginBottom: 32,
            animationDelay: "0.4s",
          }}
        >
          The Messaging &amp; Positioning Diagnostic System for women building a digital empire.
        </p>

        <p
          className="text-charcoal mx-auto animate-fade-up"
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 16,
            lineHeight: 1.7,
            maxWidth: 620,
            animationDelay: "0.5s",
          }}
        >
          Discover your exact stage in the digital journey, unlock your messaging blueprint,
          and receive training designed for the woman you actually are right now — not who anyone
          else thinks you should be.
        </p>
      </section>

      {/* SECTION 3 — Diagnostic Card */}
      <section
        className="relative mx-auto animate-fade-up card-section intro-snap"
        style={{ maxWidth: 880, animationDelay: "0.6s" }}
      >
        {/* Decorative diamond outline */}
        <div
          aria-hidden
          className="pointer-events-none"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 600,
            height: 600,
            border: "1px solid hsl(var(--gold) / 0.2)",
            transform: "translate(-50%, -50%) rotate(45deg)",
            zIndex: -1,
          }}
        />

        <div
          className="relative bg-ivory mx-auto text-center diagnostic-card"
          style={{
            maxWidth: 720,
            boxShadow: "0 30px 80px -30px rgba(15, 15, 16, 0.25)",
          }}
        >
          {/* Gold corner brackets */}
          <span aria-hidden className="absolute top-0 left-0" style={{ width: 32, height: 32, borderTop: "2px solid hsl(var(--gold))", borderLeft: "2px solid hsl(var(--gold))" }} />
          <span aria-hidden className="absolute top-0 right-0" style={{ width: 32, height: 32, borderTop: "2px solid hsl(var(--gold))", borderRight: "2px solid hsl(var(--gold))" }} />
          <span aria-hidden className="absolute bottom-0 left-0" style={{ width: 32, height: 32, borderBottom: "2px solid hsl(var(--gold))", borderLeft: "2px solid hsl(var(--gold))" }} />
          <span aria-hidden className="absolute bottom-0 right-0" style={{ width: 32, height: 32, borderBottom: "2px solid hsl(var(--gold))", borderRight: "2px solid hsl(var(--gold))" }} />

          <div
            className="text-amethyst font-semibold uppercase"
            style={{ fontSize: 10, letterSpacing: "0.4em", marginBottom: 20 }}
          >
            Begin Your Diagnostic
          </div>

          <p
            className="font-heading italic text-charcoal mx-auto"
            style={{ fontSize: 18, lineHeight: 1.4, marginBottom: 40 }}
          >
            Answer honestly. Your clarity starts here.
          </p>

          <ul
            className="text-left mx-auto"
            style={{ maxWidth: 480, marginBottom: 48, display: "flex", flexDirection: "column", gap: 18 }}
          >
            {[
              "Identify your exact stage in the digital journey",
              "Receive a custom messaging & positioning blueprint",
              "Unlock training tailored to where you actually are",
            ].map((feature) => (
              <li
                key={feature}
                className="flex items-start text-charcoal"
                style={{ fontSize: 16, lineHeight: 1.5, gap: 16 }}
              >
                <span
                  aria-hidden
                  className="flex-shrink-0 bg-gold"
                  style={{ width: 10, height: 10, transform: "rotate(45deg)", marginTop: 6 }}
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div
            className="flex items-center justify-center"
            style={{
              gap: 56,
              padding: "32px 0",
              marginBottom: 48,
              borderTop: "1px solid rgba(46, 42, 39, 0.08)",
              borderBottom: "1px solid rgba(46, 42, 39, 0.08)",
            }}
          >
            {[
              { n: "12", l: "Questions" },
              { n: "4", l: "Minutes" },
              { n: "∞", l: "Clarity" },
            ].map((s) => (
              <div key={s.l} className="text-center" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  className="font-heading text-amethyst"
                  style={{ fontSize: 36, lineHeight: 1, fontWeight: 500 }}
                >
                  {s.n}
                </div>
                <div
                  className="text-charcoal uppercase"
                  style={{
                    fontFamily: "Cinzel, serif",
                    fontSize: 9,
                    letterSpacing: "0.25em",
                    fontWeight: 500,
                  }}
                >
                  {s.l}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center" style={{ marginBottom: 16 }}>
            <button
              onClick={onStart}
              className="map-cta bg-amethyst text-pearl uppercase transition-all"
              style={{
                padding: "22px 56px",
                fontFamily: "Inter, sans-serif",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.3em",
              }}
            >
              Begin the MAP
            </button>
          </div>

          <div
            className="uppercase text-charcoal"
            style={{ fontSize: 10, letterSpacing: "0.2em" }}
          >
            <span className="font-semibold" style={{ color: "hsl(var(--gold-deep, var(--gold)))" }}>
              4 Min
            </span>{" "}
            · Honest Answers Only
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .intro-scroll {
            scroll-snap-type: y proximity;
          }
          .intro-snap {
            scroll-snap-align: start;
            scroll-snap-stop: normal;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .intro-scroll { scroll-snap-type: none; }
        }
        .hero-section { padding: 100px 24px 80px; }
        .card-section { padding: 40px 24px 120px; }
        .diagnostic-card { padding: 80px 64px; }
        @media (max-width: 768px) {
          .hero-section { padding: 56px 20px 32px; }
          .card-section { padding: 16px 20px 72px; }
        }
        @media (max-width: 640px) {
          .diagnostic-card { padding: 56px 28px; }
          .hero-section { padding: 48px 18px 24px; }
          .card-section { padding: 12px 18px 64px; }
        }
        .map-cta:hover {
          background: hsl(var(--amethyst-deep, var(--amethyst)));
          transform: translateY(-2px);
          box-shadow: 0 12px 30px -10px hsl(var(--amethyst) / 0.5);
        }
      `}</style>
    </div>
  );
}
