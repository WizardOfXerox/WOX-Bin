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

  const handoffUrl = new URL("/out", request.url);
  handoffUrl.searchParams.set("to", link.destinationUrl);
  handoffUrl.searchParams.set("via", "short-link");
  handoffUrl.searchParams.set("slug", slug);

  const response = NextResponse.redirect(handoffUrl, 307);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
