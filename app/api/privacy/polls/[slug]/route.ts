import { NextResponse } from "next/server";

import { getPrivacyPollBySlug } from "@/lib/privacy-suite";
import { getRequestIp } from "@/lib/request";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const poll = await getPrivacyPollBySlug(slug, getRequestIp(request));
  if (!poll) {
    return NextResponse.json({ error: "Poll not found." }, { status: 404 });
  }

  return NextResponse.json(poll);
}
