import { LegalPage } from "@/components/site/LegalPage";
import { CONTACT_EMAIL } from "@/components/site/SiteFooter";
import { Mail } from "lucide-react";

export default function Contact() {
  return (
    <LegalPage eyebrow="Get in touch" title="Contact">
      <p>
        We'd love to hear from you. Whether you have a question about your
        diagnostic results, need help with the Creator Access Hub, or want to
        exercise a privacy right — reach out and a real human will reply.
      </p>

      <div className="not-prose mt-8 mb-8 p-6 rounded-sm border border-border bg-pearl/60">
        <div className="eyebrow mb-2">Email</div>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex items-center gap-2 font-heading text-xl text-charcoal hover:text-amethyst transition-colors"
        >
          <Mail className="w-5 h-5" />
          {CONTACT_EMAIL}
        </a>
        <p className="text-[12px] text-charcoal/60 mt-3">
          We aim to reply within 2 business days.
        </p>
      </div>

      <h2>What to include</h2>
      <ul>
        <li>The email address you used on the diagnostic (so we can find your record).</li>
        <li>A short description of your question or request.</li>
        <li>For privacy requests, mention "Privacy request" in the subject line.</li>
      </ul>
    </LegalPage>
  );
}
