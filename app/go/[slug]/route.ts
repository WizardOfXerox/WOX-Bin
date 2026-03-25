import { NextResponse } from "next/server";

import { resolvePrivacyShortLink } from "@/lib/privacy-suite";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const link = await resolvePrivacyShortLink(slug, true);
  if (!link) {
    return NextResponse.redirect(new URL("/privacy-tools", request.url));
  }

  const response = NextResponse.redirect(link.destinationUrl, 307);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
