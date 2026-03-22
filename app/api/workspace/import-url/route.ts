import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { extractGithubGistId, normalizeRawPasteFetchUrl } from "@/lib/import-paste-url";
import { jsonError } from "@/lib/http";

const bodySchema = z.object({
  url: z.string().trim().min(1, "URL required").max(2048)
});

const MAX_BYTES = 2_000_000;

function blockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) {
    return true;
  }
  if (h.endsWith(".local")) {
    return true;
  }
  if (h === "0.0.0.0" || h === "[::1]" || h === "::1") {
    return true;
  }
  if (/^127\.\d+\.\d+\.\d+$/.test(h)) {
    return true;
  }
  if (/^10\.\d+\.\d+\.\d+$/.test(h)) {
    return true;
  }
  if (/^192\.168\.\d+\.\d+$/.test(h)) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(h)) {
    return true;
  }
  if (/^169\.254\.\d+\.\d+$/.test(h)) {
    return true;
  }
  return false;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Sign in required.", 401);
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid body.");
  }

  let target: URL;
  try {
    target = new URL(parsed.data.url);
  } catch {
    return jsonError("Invalid URL.");
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return jsonError("Only http and https URLs are allowed.");
  }

  if (blockedHost(target.hostname)) {
    return jsonError("That host is not allowed.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const gistId = extractGithubGistId(parsed.data.url);
    if (gistId) {
      const gistRes = await fetch(`https://api.github.com/gists/${gistId}`, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "WOX-Bin-import/1.0"
        }
      });
      if (!gistRes.ok) {
        return jsonError(`GitHub returned ${gistRes.status} for that gist.`, 502);
      }
      const gistJson = (await gistRes.json()) as {
        description?: string | null;
        files?: Record<string, { content?: string; filename?: string }>;
      };
      const fileEntries = Object.entries(gistJson.files ?? {});
      if (fileEntries.length === 0) {
        return jsonError("That gist has no files.", 502);
      }
      fileEntries.sort(([a], [b]) => a.localeCompare(b));
      const [firstName, firstFile] = fileEntries[0]!;
      const text = firstFile.content ?? "";
      if (text.length > MAX_BYTES) {
        return jsonError("Gist content is too large (max 2 MB).", 413);
      }
      const desc = gistJson.description?.trim();
      const title = (desc && desc.slice(0, 120)) || firstFile.filename || firstName || "Gist";
      return NextResponse.json({ text, title });
    }

    const fetchUrl = normalizeRawPasteFetchUrl(parsed.data.url);
    let fetchTarget: URL;
    try {
      fetchTarget = new URL(fetchUrl);
    } catch {
      return jsonError("Invalid URL after normalization.");
    }
    if (fetchTarget.protocol !== "http:" && fetchTarget.protocol !== "https:") {
      return jsonError("Only http and https URLs are allowed.");
    }
    if (blockedHost(fetchTarget.hostname)) {
      return jsonError("That host is not allowed.");
    }

    const res = await fetch(fetchTarget.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "WOX-Bin-import/1.0",
        Accept: "text/plain,text/html,*/*;q=0.8"
      }
    });

    if (!res.ok) {
      return jsonError(`Remote server returned ${res.status}.`, 502);
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return jsonError("Response is too large (max 2 MB).", 413);
    }

    const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    const lastSeg = fetchTarget.pathname.split("/").filter(Boolean).pop()?.replace(/\.txt$/i, "");
    const title = lastSeg ? decodeURIComponent(lastSeg).slice(0, 120) : "Imported";

    return NextResponse.json({ text, title });
  } catch {
    return jsonError("Could not fetch that URL.", 502);
  } finally {
    clearTimeout(timeout);
  }
}
