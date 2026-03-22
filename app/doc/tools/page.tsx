import type { Metadata } from "next";
import Link from "next/link";

import { DocShell } from "@/components/doc/doc-shell";

export const metadata: Metadata = {
  title: "Tools — WOX-Bin",
  description: "Browser tools and conversion platform entry points."
};

export default function DocToolsPage() {
  return (
    <DocShell
      subtitle="Client-side and hybrid conversion utilities shipped with WOX-Bin."
      title="Tools"
    >
      <p>
        The <Link href="/tools">/tools</Link> hub lists format converters, PDF helpers, data/zip labs, and links to the
        conversion registry.
      </p>

      <h2>Highlights</h2>
      <ul>
        <li>
          <Link href="/tools/convert">/tools/convert</Link> — converter hub and pair index
        </li>
        <li>
          <Link href="/tools/c">/tools/c/[pair]</Link> — per-pair routes (browser vs worker per deployment)
        </li>
        <li>
          <Link href="/tools/pdf-extract">/tools/pdf-extract</Link>,{" "}
          <Link href="/tools/pdf-split">/tools/pdf-split</Link>,{" "}
          <Link href="/tools/pdf-merge">/tools/pdf-merge</Link>
        </li>
        <li>
          <code>GET /api/convert/capabilities</code> — machine-readable capability snapshot for integrators
        </li>
      </ul>

      <h2>Documentation in the repo</h2>
      <p className="text-xs">
        FFmpeg/S3 workers, Vercel limits, and job lifecycle are described under <code>docs/TOOLS.md</code>,{" "}
        <code>docs/CONVERSION-PLATFORM.md</code>, and <code>docs/VERCEL-CONVERSIONS.md</code> (not rendered as routes
        unless you add them).
      </p>
    </DocShell>
  );
}
