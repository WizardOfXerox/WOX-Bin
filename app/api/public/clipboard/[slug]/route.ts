import { NextResponse } from "next/server";

import { getAppOrigin, getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import {
  deleteClipboardBucket,
  getClipboardBucket,
  PublicDropError,
  saveClipboardBucket
} from "@/lib/public-drops";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;

  try {
    const bucket = await getClipboardBucket(slug, request.headers.get("x-manage-token"));
    if (!bucket) {
      return jsonError("Clipboard bucket not found.", 404);
    }

    return NextResponse.json(bucket);
  } catch (error) {
    if (error instanceof PublicDropError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }
}

export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;
  const ip = getRequestIp(request) ?? "anonymous";
  const limit = await rateLimit("cli-text-upload", ip);
  if (!limit.success) {
    return jsonError("Rate limit exceeded. Try again later.", 429);
  }

  const body = (await request.json().catch(() => null)) as
    | {
        content?: string;
        expires?: string | null;
        burnAfterRead?: boolean;
        token?: string | null;
      }
    | null;

  try {
    const result = await saveClipboardBucket({
      slug,
      content: typeof body?.content === "string" ? body.content : "",
      expires: typeof body?.expires === "string" ? body.expires : null,
      burnAfterRead: Boolean(body?.burnAfterRead),
      token: typeof body?.token === "string" ? body.token : request.headers.get("x-manage-token"),
      ip,
      userAgent: request.headers.get("user-agent")
    });

    const origin = getAppOrigin(request);
    return NextResponse.json(
      {
        slug: result.slug,
        url: `${origin}${result.urlPath}`,
        expiresAt: result.expiresAt,
        created: result.created,
        manageToken: result.manageToken
      },
      {
        status: result.created ? 201 : 200
      }
    );
  } catch (error) {
    if (error instanceof PublicDropError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { slug } = await params;
  const ip = getRequestIp(request) ?? "anonymous";
  const limit = await rateLimit("file-drop-manage", ip);
  if (!limit.success) {
    return jsonError("Rate limit exceeded. Try again later.", 429);
  }

  const body = (await request.json().catch(() => null)) as { token?: string | null } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : request.headers.get("x-manage-token")?.trim() ?? "";
  if (!token) {
    return jsonError("Manage token is required.", 400);
  }

  try {
    await deleteClipboardBucket(slug, token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PublicDropError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }
}
