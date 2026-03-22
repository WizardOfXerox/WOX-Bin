import type { Metadata } from "next";

import { DocShell } from "@/components/doc/doc-shell";

export const metadata: Metadata = {
  title: "Developers API — WOX-Bin",
  description: "WOX-Bin REST API: API keys, v1 pastes, workspace routes, anonymous publish."
};

export default function DocApiPage() {
  return (
    <DocShell
      subtitle="JSON APIs for creating and managing pastes. Authenticated flows use API keys (Bearer) or a signed-in browser session."
      title="Developers API"
    >
      <p>
        Replace <code>{"{origin}"}</code> with your deployment base URL (e.g. from{" "}
        <code>NEXT_PUBLIC_APP_URL</code>). All JSON error bodies use <code>{"{ \"error\": \"...\" }"}</code> unless noted.
      </p>

      <h2>1. API keys</h2>
      <p>
        Create keys in the signed-in workspace (<strong>Settings → API keys</strong> or the workspace keys UI). Send
        the secret as a Bearer token:
      </p>
      <pre>
        {`Authorization: Bearer YOUR_API_KEY_SECRET`}
      </pre>
      <p>
        Keys are bound to your account and respect plan limits (paste count, storage, rate limits). Invalid keys return{" "}
        <code>401</code>.
      </p>

      <h2>2. Versioned paste API (recommended)</h2>
      <p>Base path: <code>{"{origin}/api/v1"}</code></p>

      <h3>GET /api/v1/me</h3>
      <p>Returns the user associated with the API key (id, username, displayName).</p>

      <h3>GET /api/v1/pastes</h3>
      <p>
        Lists your pastes. Query params: <code>limit</code>, <code>offset</code>, <code>q</code> (search). Requires
        Bearer token.
      </p>

      <h3>POST /api/v1/pastes</h3>
      <p>
        Creates a paste. Body is JSON; main fields include <code>title</code>, <code>content</code>,{" "}
        <code>language</code> (must be a supported WOX-Bin language id), <code>visibility</code> (
        <code>public</code> | <code>unlisted</code> | <code>private</code>), optional <code>folderName</code>,{" "}
        <code>tags</code>, <code>password</code>, burn/expire flags, and <code>files</code> (attachments). Successful
        create returns <code>201</code> with <code>id</code> (slug), <code>url</code>, <code>rawUrl</code>.
      </p>

      <h3>GET /api/v1/pastes/[slug]</h3>
      <p>Full paste JSON for pastes owned by this API key. <code>404</code> if missing or not owned.</p>

      <h3>PATCH /api/v1/pastes/[slug]</h3>
      <p>
        Partial update. Omit <code>files</code> to keep attachments; send <code>files: []</code> to clear them.
      </p>

      <h3>DELETE /api/v1/pastes/[slug]</h3>
      <p>Soft-deletes the paste when owned by the key.</p>

      <h2>3. Session workspace API (cookies)</h2>
      <p>
        When the user is signed in via the web app, the browser sends a session cookie. Common routes (all JSON):
      </p>
      <ul>
        <li>
          <code>GET/POST /api/workspace/pastes</code> — list / create
        </li>
        <li>
          <code>GET/PUT/DELETE /api/workspace/pastes/[slug]</code> — read / replace / delete
        </li>
        <li>
          <code>GET/POST/PATCH /api/workspace/folders</code> — folder helpers
        </li>
        <li>
          <code>GET/POST /api/workspace/keys</code> — API key management
        </li>
      </ul>
      <p>Use these from your own frontend on the same origin, or from tools that can store cookies—not ideal for third-party server scripts (prefer v1 + API key).</p>

      <h2>4. Anonymous public paste</h2>
      <p>
        <code>POST /api/public/pastes</code> — creates a paste without an account. Requires a valid{" "}
        <strong>Cloudflare Turnstile</strong> token in the body when Turnstile is configured. Visibility is restricted
        to <code>public</code> or <code>unlisted</code>. Subject to anonymous rate limits.
      </p>

      <h2>5. Public JSON feed</h2>
      <p>
        <code>GET /api/public/feed</code> lists recent public pastes. Optional <code>?limit=</code> is capped by{" "}
        <strong>scrape tier</strong> (anonymous vs plan, when you send <code>Authorization: Bearer</code> with a valid
        API key). See <a href="/doc/scraping">Scraping &amp; public data</a> for the rate-limit table.
      </p>

      <h2>6. Other endpoints</h2>
      <ul>
        <li>
          <code>GET /api/pastes/[slug]</code> — public paste payload for viewers (visibility rules apply).
        </li>
        <li>
          <code>POST /api/pastes/[slug]/unlock</code> — password unlock cookie.
        </li>
        <li>
          <code>GET/POST /api/pastes/[slug]/comments</code>, <code>POST .../star</code>, <code>POST /api/reports</code>.
        </li>
        <li>
          Conversion: <code>GET /api/convert/capabilities</code>, <code>POST /api/convert/jobs</code>, etc. — see{" "}
          <a href="/doc/tools">Tools</a> and <code>docs/CONVERSION-PLATFORM.md</code>.
        </li>
        <li>
          Pastebin import: <code>GET/POST /api/migrate/pastebin</code> — both require a signed-in session;{" "}
          <code>GET</code> reports whether <code>PASTEBIN_API_DEV_KEY</code> is set on the server.
        </li>
      </ul>

      <h2>7. Rate limits &amp; plan errors</h2>
      <p>
        API-key routes use Redis-backed limits when <code>UPSTASH_REDIS_*</code> is set. Expect <code>429</code> when
        exceeded. Plan overages may return <code>403</code> with extra fields (<code>code</code>, <code>plan</code>,
        etc.). If Redis is not configured, a smaller set of routes (register, sign-in, password reset, anonymous publish)
        still use per-process memory limits — use Redis in production for consistent protection across instances (
        <code>docs/SECURITY.md</code>).
      </p>
    </DocShell>
  );
}
