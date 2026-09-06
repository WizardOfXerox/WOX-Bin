import { NextResponse } from "next/server";

import { getAppOrigin, getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { PublicDropError, createTextDrop } from "@/lib/public-drops";

function textError(message: string, status = 400) {
  return new NextResponse(`${message}\n`, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}

export async function POST(request: Request) {
  const ip = getRequestIp(request) ?? "anonymous";
  const limit = await rateLimit("cli-text-upload", ip);
  if (!limit.success) {
    return textError("Rate limit exceeded. Try again later.", 429);
  }

  const url = new URL(request.url);
  let content = "";
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      const fileEntry = formData.get("file") || formData.get("f") || formData.get("data") || formData.get("content");
      if (fileEntry instanceof File) {
        content = await fileEntry.text();
      } else if (typeof fileEntry === "string") {
        content = fileEntry;
      } else {
        for (const value of formData.values()) {
          if (value instanceof File) {
            content = await value.text();
            break;
          } else if (typeof value === "string") {
            content = value;
            break;
          }
        }
      }
    } catch {
      return textError("Could not parse multipart form data.", 400);
    }
  } else {
    content = await request.text();
  }

  const expires = url.searchParams.get("expires") || request.headers.get("x-expires");
  const burnAfterRead = url.searchParams.get("burn") === "1" || request.headers.get("x-burn") === "1";

  try {
    const drop = await createTextDrop({
      content,
      expires,
      burnAfterRead,
      ip,
      userAgent: request.headers.get("user-agent")
    });

    const origin = getAppOrigin(request);
    return new NextResponse(`${origin}${drop.urlPath}\n`, {
      status: 201,
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  } catch (error) {
    if (error instanceof PublicDropError) {
      return textError(error.message, error.status);
    }
    throw error;
  }
}

export const PUT = POST;
