import type { Metadata } from "next";
import Link from "next/link";

import { DocShell } from "@/components/doc/doc-shell";
import { TOOLS_ENABLED } from "@/lib/tools/availability";

export const metadata: Metadata = {
  title: "Documentation",
  description: "WOX-Bin API, public data, tools, and FAQ."
};

export default function DocIndexPage() {
  return (
    <DocShell
      subtitle="Machine-readable endpoints and human-readable guides for integrators and operators."
      title="Developer documentation"
    >
      <p>
        WOX-Bin exposes a REST-style JSON API for pastes, optional conversion jobs, and settings. Public pastes can
        also be read via HTML pages, Atom, and raw text URLs—similar in spirit to{" "}
        <a href="https://pastebin.com/doc_api" rel="noopener noreferrer" target="_blank">
          Pastebin’s Developers API
        </a>{" "}
        and{" "}
        <a href="https://pastebin.com/doc_scraping_api" rel="noopener noreferrer" target="_blank">
          Scraping API
        </a>{" "}
        docs (we are not affiliated with Pastebin).
      </p>

      <p>
        The project centers on the paste workspace at <code>/app</code>. The utilities surface under <code>/tools</code>{" "}
        {TOOLS_ENABLED
          ? "is also enabled on this deployment, and the two areas are documented separately so operators can keep product boundaries and hosting requirements clear."
          : "is currently disabled on this deployment while that product surface is being finished."}
      </p>

      <ul className="!mt-4 space-y-2">
        <li>
          <Link href="/doc/api">
            <strong className="text-foreground">API</strong>
          </Link>{" "}
          — API keys, <code>/api/v1/*</code>, session workspace routes, anonymous publish.
        </li>
        <li>
          <Link href="/doc/scraping">
            <strong className="text-foreground">Scraping &amp; public data</strong>
          </Link>{" "}
          — feeds, archive, raw URLs, JSON feed; fair-use guidelines.
        </li>
        <li>
          <Link href="/doc/tools">
            <strong className="text-foreground">Tools</strong>
          </Link>{" "}
          — {TOOLS_ENABLED ? "browser tools hub and conversion platform pointers." : "status page and planned conversion surface."}
        </li>
        <li>
          <Link href="/bookmarkfs">
            <strong className="text-foreground">BookmarkFS companion</strong>
          </Link>{" "}
          — browser extension positioning, local vault model, and how it fits with hosted WOX-Bin.
        </li>
        <li>
          <Link href="/quick">
            <strong className="text-foreground">Quick share surfaces</strong>
          </Link>{" "}
          — <code>/quick</code>, <code>/fragment</code>, and <code>/clipboard</code> for fast public, fragment-only, and
          temporary text handoff flows.
        </li>
        <li>
          <Link href="/changelog">
            <strong className="text-foreground">Changelog</strong>
          </Link>{" "}
          — shipped product changes and recent platform updates.
        </li>
        <li>
          <Link href="/doc/faq">
            <strong className="text-foreground">FAQ</strong>
          </Link>{" "}
          — common integration questions.
        </li>
      </ul>

      <h2>Pastebin-style shortcuts</h2>
      <p>
        For bookmarks that mirror Pastebin URL patterns, these redirect to the sections above:
      </p>
      <ul>
        <li>
          <code>/doc_api</code> → <Link href="/doc/api">/doc/api</Link>
        </li>
        <li>
          <code>/doc_scraping_api</code> → <Link href="/doc/scraping">/doc/scraping</Link>
        </li>
      </ul>

      <p className="text-xs">
        In-repo operator docs (database, workers, Vercel) stay under <code>docs/</code> in the project — see{" "}
        <code>README.md</code> and <code>docs/README.md</code> if you self-host.
      </p>
    </DocShell>
  );
}
