import { LegalPage } from "@/components/site/LegalPage";
import { CONTACT_EMAIL } from "@/components/site/SiteFooter";

export default function Cookies() {
  return (
    <LegalPage eyebrow="Legal" title="Cookies & Tracking Notice" updated="April 2026">
      <p>
        We try to keep tracking minimal and transparent. This page explains
        exactly what we use.
      </p>

      <h2>1. What we use</h2>
      <ul>
        <li>
          <strong>Authentication cookies</strong> — set by our backend provider
          when you sign in to the admin area. Required for the service to work.
        </li>
        <li>
          <strong>Browser session storage</strong> — a small key
          (<code>hq_tracking_dedupe_v1</code>) used to avoid sending the same
          analytics event twice within 30 minutes. It does not contain any
          personal information and is cleared when you close the browser session.
        </li>
        <li>
          <strong>Server-side click tracking</strong> — when you click a
          recommended link or the Creator Access Hub button, we record the link
          name, your stage results, your name and email (if known), and whether
          you authorized the Creator Access Hub handoff. This is used for
          internal reporting only.
        </li>
      </ul>

      <h2>2. What we do NOT use</h2>
      <ul>
        <li>No third-party advertising cookies.</li>
        <li>No cross-site behavioral tracking.</li>
        <li>No selling of your data.</li>
      </ul>

      <h2>3. Your choices</h2>
      <p>
        You can clear browser session storage at any time via your browser
        settings. To opt out of marketing emails, use the unsubscribe link in
        any email. To request deletion of your stored data, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>4. Contact</h2>
      <p>
        Questions about tracking? Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
