import { LegalPage } from "@/components/site/LegalPage";
import { CONTACT_EMAIL } from "@/components/site/SiteFooter";
import { Mail } from "lucide-react";

export default function Contact() {
  const subject = encodeURIComponent("Hello Diamond Digital Diva");
  const body = encodeURIComponent(
    "Hi there,\n\nI took the diagnostic using this email: \n\nMy question / request:\n\nThanks!"
  );

  return (
    <LegalPage eyebrow="Get in touch" title="Contact">
      <p>
        We'd love to hear from you. Whether you have a question about your
        diagnostic results, need help with the Creator Access Hub, or want to
        exercise a privacy right — reach out and a real human will reply.
      </p>

      <div className="not-prose mt-8 mb-8 p-6 rounded-sm border border-border bg-pearl/60">
        <div className="eyebrow mb-2">Email us directly</div>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`}
          className="inline-flex items-center gap-2 font-heading text-xl text-charcoal hover:text-amethyst transition-colors break-all"
        >
          <Mail className="w-5 h-5 shrink-0" />
          {CONTACT_EMAIL}
        </a>
        <p className="text-[12px] text-charcoal/60 mt-3">
          Click the address above to open your email app with a pre-filled
          message. We aim to reply within 2 business days.
        </p>
      </div>

      <h2>Our information</h2>
      <ul>
        <li><strong>Business:</strong> Diamond Digital Diva</li>
        <li>
          <strong>Email:</strong>{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </li>
        <li><strong>Hours:</strong> Monday–Friday, replies within 2 business days</li>
        <li><strong>Jurisdiction:</strong> United States</li>
      </ul>

      <h2>What to include</h2>
      <ul>
        <li>The email address you used on the diagnostic (so we can find your record).</li>
        <li>A short description of your question or request.</li>
        <li>For privacy requests, mention "Privacy request" in the subject line.</li>
      </ul>
    </LegalPage>
  );
}
