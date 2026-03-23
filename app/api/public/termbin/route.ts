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
  const content = await request.text();

  try {
    const drop = await createTextDrop({
      content,
      expires: url.searchParams.get("expires"),
      burnAfterRead: url.searchParams.get("burn") === "1",
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
