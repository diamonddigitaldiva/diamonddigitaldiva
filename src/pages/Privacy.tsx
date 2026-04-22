import { LegalPage } from "@/components/site/LegalPage";
import { CONTACT_EMAIL } from "@/components/site/SiteFooter";

export default function Privacy() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy Policy" updated="April 2026">
      <p>
        Diamond Digital Diva ("we", "us") respects your privacy. This policy
        explains what we collect when you use The Map diagnostic and the
        Creator Access Hub, how we use it, and your choices.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li>
          <strong>Information you give us:</strong> first name, email address,
          quiz answers, and any feedback you submit.
        </li>
        <li>
          <strong>Derived results:</strong> the primary and secondary stage we
          calculate from your answers.
        </li>
        <li>
          <strong>Activity data:</strong> which result links and Hub buttons
          you click, timestamps, and whether you authorized the Creator Access
          Hub handoff.
        </li>
        <li>
          <strong>Technical data:</strong> minimal browser session data stored
          locally (e.g. session storage keys) used to prevent duplicate event
          submissions. We do not use third-party advertising cookies.
        </li>
      </ul>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To calculate and deliver your diagnostic results.</li>
        <li>To send the resources and occasional marketing emails you opted into.</li>
        <li>
          If you check the Creator Access Hub consent box, to securely transfer
          your name, email, and results to the Creator Access Hub so Ava can
          give you tailored recommendations.
        </li>
        <li>To improve our services and produce aggregate reports.</li>
      </ul>

      <h2>3. Creator Access Hub handoff</h2>
      <p>
        The handoff only happens if you explicitly check the consent box on the
        results form. We create a short-lived session (valid for up to 2 hours)
        in our backend and pass only an opaque session ID to the Hub. The Hub
        retrieves your details from that session through a secured server-side
        function and then marks it consumed. You can withdraw consent at any
        time by emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>4. Sharing</h2>
      <p>
        We share your information only with: (a) the Creator Access Hub, when
        you have given consent; (b) our email and CRM provider, to deliver the
        resources you signed up for; and (c) service providers acting on our
        behalf under confidentiality obligations. We do not sell your personal
        information.
      </p>

      <h2>5. Retention</h2>
      <p>
        Quiz submissions and feedback are retained while your account or
        marketing relationship with us is active. Handoff sessions automatically
        expire after 2 hours. You can request deletion of your data at any time.
      </p>

      <h2>6. Your rights (US residents)</h2>
      <p>
        Depending on your state, you may have the right to know what personal
        information we hold about you, request a copy, request deletion, or
        opt out of marketing emails. To exercise any of these rights, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>7. Security</h2>
      <p>
        We use industry-standard safeguards including row-level security on our
        database and TLS in transit. No system is perfectly secure; please use
        a unique email and report any suspected issues to us.
      </p>

      <h2>8. Children</h2>
      <p>The diagnostic is intended for users 18 years or older. We do not knowingly collect data from children.</p>

      <h2>9. Changes</h2>
      <p>
        We may update this policy from time to time. The "Last updated" date
        above will reflect any change. Material changes will be communicated by
        email when we have your address.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions or requests? Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
