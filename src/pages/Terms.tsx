import { LegalPage } from "@/components/site/LegalPage";
import { CONTACT_EMAIL } from "@/components/site/SiteFooter";

export default function Terms() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of Service" updated="April 2026">
      <p>
        These Terms govern your use of The Map diagnostic, the Creator Access
        Hub, and any related properties operated by Diamond Digital Diva ("we",
        "us"). By using our services you agree to these Terms.
      </p>

      <h2>1. The service</h2>
      <p>
        We provide an editorial diagnostic that maps your answers to a
        recommended stage and resources. Results are educational and reflect
        your responses at the moment they are taken. They are not professional
        advice and do not guarantee any business, financial, or personal outcome.
      </p>

      <h2>2. Eligibility</h2>
      <p>You must be at least 18 years old and able to enter a binding contract to use the service.</p>

      <h2>3. Your account & data</h2>
      <p>
        You agree to provide accurate information (including your real first
        name and a valid email address) and not to impersonate anyone. Our use
        of your information is described in the <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>4. Acceptable use</h2>
      <ul>
        <li>Don't attempt to bypass authentication, scraping limits, or our consent flows.</li>
        <li>Don't submit unlawful, abusive, or infringing content in feedback or other forms.</li>
        <li>Don't resell or redistribute the diagnostic, its content, or paid resources without written permission.</li>
      </ul>

      <h2>5. Affiliate & partner disclosures</h2>
      <p>
        Some links on the results page, in the Boutique, and inside the
        Creator Access Hub may lead to paid offers from us or our partners. We
        may earn a commission from purchases made through those links at no
        extra cost to you. We only recommend resources we genuinely believe
        will help.
      </p>

      <h2>6. Email marketing</h2>
      <p>
        By submitting your name and email you agree to receive resources and
        occasional marketing emails from Diamond Digital Diva. You can
        unsubscribe at any time via the link in any email.
      </p>

      <h2>7. Intellectual property</h2>
      <p>
        All content, branding, and code in The Map and the Creator Access Hub
        are the property of Diamond Digital Diva or its licensors and protected
        by US and international intellectual property laws. We grant you a
        limited, non-transferable license to access the service for personal,
        non-commercial use.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        The service is provided "as is" without warranties of any kind, express
        or implied, including merchantability, fitness for a particular purpose,
        and non-infringement. We do not warrant that results, recommendations,
        or links will produce specific outcomes.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Diamond Digital Diva will not be
        liable for any indirect, incidental, special, consequential, or punitive
        damages, or any loss of profits or revenues, arising from your use of
        the service. Our total liability for any claim relating to the service
        will not exceed USD $100.
      </p>

      <h2>10. Indemnification</h2>
      <p>
        You agree to indemnify and hold Diamond Digital Diva harmless from any
        claims arising out of your misuse of the service or violation of these
        Terms.
      </p>

      <h2>11. Termination</h2>
      <p>
        We may suspend or terminate your access if you breach these Terms.
        You may stop using the service at any time and request data deletion
        per the Privacy Policy.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These Terms are governed by the laws of the United States and the state
        in which Diamond Digital Diva is operated, without regard to conflict-
        of-law principles. Any dispute will be resolved in the courts located
        in that jurisdiction, unless applicable consumer-protection law gives
        you the right to bring claims elsewhere.
      </p>

      <h2>13. Changes</h2>
      <p>We may update these Terms; the "Last updated" date will reflect any change. Continued use after changes constitutes acceptance.</p>

      <h2>14. Contact</h2>
      <p>
        Questions about these Terms? Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
