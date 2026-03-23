import type { Metadata } from "next";
import Link from "next/link";

import { DocShell } from "@/components/doc/doc-shell";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about WOX-Bin APIs and public pages."
};

export default function DocFaqPage() {
  return (
    <DocShell title="FAQ">
      <h2>Do I need an account to use the API?</h2>
      <p>
        To manage <strong>your</strong> pastes programmatically, yes—create an account, then create an API key and use{" "}
        <Link href="/doc/api">/api/v1/*</Link>. Anonymous one-off posts can use{" "}
        <code>POST /api/public/pastes</code> with Turnstile where configured.
      </p>

      <h2>Where is the “raw” URL?</h2>
      <p>
        After create, API responses include <code>rawUrl</code> (path-only). Full URL is{" "}
        <code>{"{origin}/raw/{slug}"}</code>.
      </p>

      <h2>Is there a Pastebin-compatible API?</h2>
      <p>
        WOX-Bin uses its own JSON shape, not Pastebin’s <code>api_post.php</code> parameters. To import from Pastebin,
        use <strong>Settings → Pastebin import</strong> (server configured with <code>PASTEBIN_API_DEV_KEY</code>).
      </p>

      <h2>Why was I rate limited?</h2>
      <p>
        Anonymous publishes, API-key traffic, and some other routes are rate-limited (often via Upstash Redis). Back off
        and retry; upgrade plan or run your own instance if you need higher quotas.
      </p>

      <h2>Where are the legal pages?</h2>
      <p>
        <Link href="/terms">Terms of Service</Link>. Add your own privacy policy if you collect personal data.
      </p>
    </DocShell>
  );
}
