import type { Metadata } from "next";
import Link from "next/link";

import { DocShell } from "@/components/doc/doc-shell";

export const metadata: Metadata = {
  title: "Documentation — WOX-Bin",
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
        The project has two main surfaces: the paste workspace at <code>/app</code> and the utilities surface at{" "}
        <code>/tools</code>. They share the same repo and deployment, but they are intentionally documented as separate
        areas so operators can keep Vercel requirements and product boundaries clear.
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
          — browser tools hub and conversion platform pointers.
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
