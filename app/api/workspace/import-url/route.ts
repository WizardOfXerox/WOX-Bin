import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { extractGithubGistId, normalizeRawPasteFetchUrl } from "@/lib/import-paste-url";
import { jsonError } from "@/lib/http";
import {
  assertSafePublicUrl,
  readResponseTextCapped,
  safeFetchPublicUrl,
  SafeOutboundError
} from "@/lib/safe-outbound";

const bodySchema = z.object({
  url: z.string().trim().min(1, "URL required").max(2048)
});

const MAX_BYTES = 2_000_000;

function safeTitleSegment(input: string | undefined) {
  if (!input) {
    return "Imported";
  }
  try {
    return decodeURIComponent(input).slice(0, 120) || "Imported";
  } catch {
    return input.slice(0, 120) || "Imported";
  }
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

  try {
    await assertSafePublicUrl(parsed.data.url, "Import URL");
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid URL.");
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
      if (Buffer.byteLength(text, "utf8") > MAX_BYTES) {
        return jsonError("Gist content is too large (max 2 MB).", 413);
      }
      const desc = gistJson.description?.trim();
      const title = (desc && desc.slice(0, 120)) || firstFile.filename || firstName || "Gist";
      return NextResponse.json({ text, title });
    }

    const fetchUrl = normalizeRawPasteFetchUrl(parsed.data.url);
    const { response, finalUrl } = await safeFetchPublicUrl(fetchUrl, {
      label: "Import URL",
      maxRedirects: 3,
      signal: controller.signal,
      headers: {
        "User-Agent": "WOX-Bin-import/1.0",
        Accept: "text/plain,text/html,*/*;q=0.8"
      }
    });

    if (!response.ok) {
      return jsonError(`Remote server returned ${response.status}.`, 502);
    }

    const text = await readResponseTextCapped(response, MAX_BYTES, "Imported response");
    const lastSeg = finalUrl.pathname.split("/").filter(Boolean).pop()?.replace(/\.txt$/i, "");
    const title = safeTitleSegment(lastSeg);

    return NextResponse.json({ text, title });
  } catch (error) {
    if (error instanceof SafeOutboundError) {
      return jsonError(error.message, error.status);
    }
    return jsonError("Could not fetch that URL.", 502);
  } finally {
    clearTimeout(timeout);
  }
}
