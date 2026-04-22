import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "./SiteFooter";
import { ReactNode } from "react";

interface LegalPageProps {
  eyebrow: string;
  title: string;
  updated?: string;
  children: ReactNode;
}

export function LegalPage({ eyebrow, title, updated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-cream text-charcoal flex flex-col">
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 pt-10 pb-16">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.25em] text-charcoal/60 hover:text-amethyst transition-colors mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to The Map
          </Link>

          <div className="eyebrow mb-3">{eyebrow}</div>
          <h1 className="font-heading text-3xl md:text-5xl mb-3">{title}</h1>
          {updated && (
            <p className="text-[12px] text-charcoal/55 mb-10">Last updated: {updated}</p>
          )}

          <article className="legal-prose">{children}</article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
