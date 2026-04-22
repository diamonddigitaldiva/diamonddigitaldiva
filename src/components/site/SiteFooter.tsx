import { Link } from "react-router-dom";

export const CONTACT_EMAIL = "Info@diamonddigitaldiva.com";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border bg-pearl/50">
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-[12px] text-charcoal/70">
        <div className="font-heading tracking-wide text-charcoal">
          © {year} Diamond Digital Diva
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-2 items-center">
          <Link to="/privacy" className="hover:text-amethyst transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-amethyst transition-colors">Terms</Link>
          <Link to="/cookies" className="hover:text-amethyst transition-colors">Cookies & Tracking</Link>
          <Link to="/contact" className="hover:text-amethyst transition-colors">Contact</Link>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="hover:text-amethyst transition-colors"
          >
            {CONTACT_EMAIL}
          </a>
        </nav>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-8">
        <details className="group text-[11px] text-charcoal/70 leading-relaxed border-t border-border/60 pt-4">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-2 font-heading tracking-[0.2em] uppercase text-[11px] text-charcoal hover:text-amethyst transition-colors">
            <span>Disclosures</span>
            <span className="transition-transform group-open:rotate-180" aria-hidden>▾</span>
          </summary>
          <div className="mt-4 space-y-2 text-charcoal/60">
            <p>
              <strong>Educational disclaimer:</strong> Diagnostic results are
              educational and reflect your responses on the day taken. They are not
              guarantees of business outcomes, revenue, or results.
            </p>
            <p>
              <strong>Affiliate / partner disclosure:</strong> Some links from your
              results page, the Boutique, and the Creator Access Hub may lead to
              paid offers from Diamond Digital Diva or its partners. We may earn
              from purchases made through those links.
            </p>
            <p>
              <strong>Email marketing:</strong> By submitting your name and email
              you agree to receive resources and occasional marketing emails. You
              can unsubscribe anytime via the link in any email.
            </p>
          </div>
        </details>
      </div>
    </footer>
  );
}
