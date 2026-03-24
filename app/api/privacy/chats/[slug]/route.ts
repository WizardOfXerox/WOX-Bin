import { NextResponse } from "next/server";

import { getPrivacyChatRoomBySlug } from "@/lib/privacy-suite";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const room = await getPrivacyChatRoomBySlug(slug);
  if (!room) {
    return NextResponse.json({ error: "Chat room not found." }, { status: 404 });
  }

  return NextResponse.json(room);
}
