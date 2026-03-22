import type { Metadata } from "next";
import Link from "next/link";

import { DocShell } from "@/components/doc/doc-shell";

export const metadata: Metadata = {
  title: "Scraping & public data — WOX-Bin",
  description: "Public feeds, raw URLs, and fair-use guidelines for reading WOX-Bin without an API key."
};

export default function DocScrapingPage() {
  return (
    <DocShell
      subtitle="How to read public and unlisted content programmatically. Unlike Pastebin PRO scraping, WOX-Bin does not require a whitelisted IP for these public surfaces—but abuse may still be rate-limited or blocked."
      title="Scraping & public data"
    >
      <p>
        Pastebin offers a separate{" "}
        <a href="https://pastebin.com/doc_scraping_api" rel="noopener noreferrer" target="_blank">
          Scraping API
        </a>{" "}
        (PRO + IP whitelist). WOX-Bin instead exposes <strong>normal HTTP routes</strong> for the same general goals:
        discover recent public pastes and fetch raw text. Always respect robots, caching headers, and applicable law.
      </p>

      <h2>1. Human-readable discovery</h2>
      <ul>
        <li>
          <Link href="/feed">
            <code>/feed</code>
          </Link>{" "}
          — card layout of recent <strong>public</strong> pastes (no password, active, not deleted).
        </li>
        <li>
          <Link href="/feed.xml">
            <code>/feed.xml</code>
          </Link>{" "}
          — Atom feed (same pool, capped list).
        </li>
        <li>
          <Link href="/archive">
            <code>/archive</code>
          </Link>{" "}
          — compact table of recent public pastes.
        </li>
      </ul>

      <h2>2. JSON feed — plan-tiered limits</h2>
      <p>
        <code>GET {"{origin}/api/public/feed"}</code> returns public pastes as JSON. Optional query{" "}
        <code>?limit=</code> is capped by tier. Send <code>Authorization: Bearer YOUR_API_KEY</code> to use{" "}
        <strong>your account’s hosted plan</strong> (free / pro / team / admin quotas) for both rate limits and max
        <code>limit</code>. Invalid keys are treated like anonymous traffic (we don’t reveal whether a key exists).
      </p>
      <p>When <strong>Upstash Redis</strong> is configured, shared hourly buckets apply to both this endpoint and{" "}
        <code>/raw/…</code> (same tier for a given IP or API key user).</p>
      <div className="overflow-x-auto">
        <table className="!mt-4 text-xs sm:text-sm">
          <thead>
            <tr>
              <th>Tier</th>
              <th>How you get it</th>
              <th className="whitespace-nowrap">~Requests / hour</th>
              <th className="whitespace-nowrap">Max <code>limit</code></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Anonymous</td>
              <td>No Bearer token (or invalid token)</td>
              <td>120</td>
              <td>40</td>
            </tr>
            <tr>
              <td>Free</td>
              <td>Valid API key, free quota plan</td>
              <td>400</td>
              <td>80</td>
            </tr>
            <tr>
              <td>Pro</td>
              <td>Valid API key, pro billing active</td>
              <td>2,000</td>
              <td>120</td>
            </tr>
            <tr>
              <td>Team</td>
              <td>Valid API key, team billing active</td>
              <td>6,000</td>
              <td>200</td>
            </tr>
            <tr>
              <td>Admin</td>
              <td>Operator / staff quota tier</td>
              <td>50,000</td>
              <td>500</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="!mt-4 text-xs">
        Response headers include <code>X-RateLimit-*</code>, <code>X-Wox-Scrape-Tier</code>, and{" "}
        <code>Retry-After</code> on <code>429</code>. Anonymous responses may be CDN-cached briefly; authenticated
        responses use <code>private, no-store</code>.
      </p>

      <h2>3. Raw paste body</h2>
      <p>
        For many public or unlisted pastes, plain text is available at{" "}
        <code>
          {"{origin}/raw/{slug}"}
        </code>
        . The same <strong>scrape tier + hourly bucket</strong> as the JSON feed applies (optional{" "}
        <code>Authorization: Bearer</code> to unlock higher limits). Password-protected pastes require unlocking through
        the web UI / session first. Private pastes are not world-readable.
      </p>

      <h2>4. Single paste JSON (viewer)</h2>
      <p>
        <code>GET {"{origin}/api/pastes/{slug}"}</code> returns paste metadata and content when visibility rules allow.
        Do not use this to brute-force private slugs.
      </p>

      <h2>5. Recommended etiquette</h2>
      <ul>
        <li>Cache responses locally; avoid re-fetching unchanged pastes.</li>
        <li>Use a descriptive <code>User-Agent</code> with contact info for your project.</li>
        <li>Stay within your tier’s rate limits; upgrade plan or use an API key if you need higher throughput.</li>
        <li>For account-owned bulk access, use <Link href="/doc/api">API keys</Link> and <code>/api/v1/pastes</code>.</li>
      </ul>

      <h2>6. Operator note</h2>
      <p className="text-xs">
        Self-hosted instances may put a reverse proxy, CDN, or WAF in front; document your own limits for end users.
      </p>
    </DocShell>
  );
}
