import { NextResponse } from "next/server";

import {
  buildDropResponse,
  deleteDropByToken,
  getDropForServe,
  incrementDropView,
  updateDropExpiryByToken,
  PublicDropError
} from "@/lib/public-drops";
import { getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";

type Params = {
  params: Promise<{
    slug: string;
    filename?: string[];
  }>;
};

function textError(message: string, status = 400) {
  return new NextResponse(`${message}\n`, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}

export async function GET(request: Request, { params }: Params) {
  const { slug, filename } = await params;
  const row = await getDropForServe(slug);
  if (!row) {
    return textError("File not found.", 404);
  }

  const url = new URL(request.url);
  const response = buildDropResponse(row, {
    download: url.searchParams.get("download") === "1",
    filenameOverride: filename?.[filename.length - 1] ?? null
  });
  await incrementDropView(row);
  return response;
}

export async function POST(request: Request, { params }: Params) {
  const ip = getRequestIp(request) ?? "anonymous";
  const limit = await rateLimit("file-drop-manage", ip);
  if (!limit.success) {
    return textError("Rate limit exceeded. Try again later.", 429);
  }

  const { slug } = await params;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return textError("Expected multipart/form-data.", 400);
  }

  const token = typeof form.get("token") === "string" ? String(form.get("token")).trim() : "";
  if (!token) {
    return textError("Missing management token.", 403);
  }

  try {
    if (form.has("delete")) {
      await deleteDropByToken(slug, token);
      return new NextResponse("OK\n", {
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        }
      });
    }

    if (typeof form.get("expires") === "string" && String(form.get("expires")).trim()) {
      const expiresAt = await updateDropExpiryByToken(slug, token, String(form.get("expires")).trim());
      return new NextResponse(`${expiresAt.toISOString()}\n`, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        }
      });
    }

    return textError("No management action requested.", 400);
  } catch (error) {
    if (error instanceof PublicDropError) {
      return textError(error.message, error.status);
    }
    throw error;
  }
}
