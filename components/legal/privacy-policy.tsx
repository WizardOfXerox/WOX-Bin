/**
 * Privacy policy copy for WOX-Bin.
 * Operators should have this reviewed for their jurisdiction (GDPR, CCPA, etc.) and fill in
 * contact details, data processor names, and retention periods.
 */
export function PrivacyPolicyContent() {
  return (
    <article className="space-y-6 text-sm leading-relaxed [&>p]:text-muted-foreground">
      <p>
        <strong className="text-foreground">Effective date:</strong> March 19, 2025.{" "}
        <strong className="text-foreground">Controller:</strong> the person or organization operating this WOX-Bin
        deployment (“we”, “us”). This policy describes how we handle personal data when you use the Service (website,
        APIs, and related tools).
      </p>

      <h2 className="scroll-mt-24 text-lg font-semibold text-foreground" id="data-we-collect">
        1. Data we collect
      </h2>
      <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
        <li>
          <strong className="text-foreground">Account data:</strong> email (if provided), username, display name, profile
          image URL from OAuth providers, password hash (for credential accounts), and auth identifiers managed by NextAuth.
        </li>
        <li>
          <strong className="text-foreground">Content:</strong> pastes, attachments metadata, comments, and settings you save
          in the workspace.
        </li>
        <li>
          <strong className="text-foreground">Technical data:</strong> IP-derived rate limiting, browser session records for
          security (e.g. idle timeout / revoke), audit log entries for security-sensitive actions, and standard server logs.
        </li>
        <li>
          <strong className="text-foreground">Payments:</strong> if you use paid tiers, our payment processor (e.g. PayMongo,
          Xendit, Stripe, or another provider chosen by the operator) processes card or wallet data; we typically store
          customer/subscription identifiers, not full card numbers.
        </li>
      </ul>

      <h2 className="scroll-mt-24 text-lg font-semibold text-foreground" id="purposes">
        2. How we use data
      </h2>
      <p>We use personal data to:</p>
      <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
        <li>Provide accounts, authentication, and sync across devices.</li>
        <li>Operate, secure, and improve the Service (including abuse prevention and rate limits).</li>
        <li>Send transactional email when SMTP is configured (e.g. password reset, optional email verification, magic-link
        sign-in).</li>
        <li>Meet legal obligations and enforce our Terms.</li>
      </ul>

      <h2 className="scroll-mt-24 text-lg font-semibold text-foreground" id="sharing">
        3. Sharing
      </h2>
      <p>
        We do not sell your personal data. We use subprocessors chosen by this deployment’s operator — commonly including
        hosting (e.g. Vercel), database (e.g. Neon), Redis (e.g. Upstash), email (your SMTP provider), captcha (Cloudflare
        Turnstile), and payments (e.g. PayMongo, Xendit, or Stripe). Their processing is governed by their terms and DPAs
        where applicable.
      </p>

      <h2 className="scroll-mt-24 text-lg font-semibold text-foreground" id="retention">
        4. Retention
      </h2>
      <p>
        We keep account and content data until you delete it or delete your account, or until the operator removes it for
        legal/operational reasons. Logs and backups may persist for a limited period according to operator policy.
      </p>

      <h2 className="scroll-mt-24 text-lg font-semibold text-foreground" id="rights">
        5. Your choices
      </h2>
      <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
        <li>
          <strong className="text-foreground">Export:</strong> signed-in users can download a JSON export from{" "}
          <strong className="text-foreground">Settings → Account</strong> (profile and recent pastes — see in-app notes).
        </li>
        <li>
          <strong className="text-foreground">Delete account:</strong> available from the same screen, subject to team
          membership rules described there.
        </li>
        <li>
          <strong className="text-foreground">Regional rights:</strong> depending on where you live, you may have rights to
          access, correct, port, or object to processing — contact the operator using the channel they publish for this
          deployment.
        </li>
      </ul>

      <h2 className="scroll-mt-24 text-lg font-semibold text-foreground" id="children">
        6. Children
      </h2>
      <p>
        The Service is not directed at children under 13 (or the minimum age in your region). Do not register if you do not
        meet the age requirement in your Terms.
      </p>

      <h2 className="scroll-mt-24 text-lg font-semibold text-foreground" id="changes">
        7. Changes
      </h2>
      <p>
        We may update this policy; the effective date will change accordingly. Continued use after updates constitutes
        acceptance unless applicable law requires additional steps.
      </p>

      <h2 className="scroll-mt-24 text-lg font-semibold text-foreground" id="contact">
        8. Contact
      </h2>
      <p>
        For privacy requests, contact the operator of this deployment (e.g. the email or support URL shown on the site or in
        repository documentation).
      </p>
    </article>
  );
}
