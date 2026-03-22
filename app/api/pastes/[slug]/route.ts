import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { getPasteForViewer } from "@/lib/paste-service";
import { jsonError } from "@/lib/http";
import { viewerFromSession } from "@/lib/session";
import { getPasteAccessCookieName } from "@/lib/paste-access";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_: Request, { params }: Params) {
  const session = await auth();
  const viewer = viewerFromSession(session);
  const { slug } = await params;
  const cookieStore = await cookies();
  const accessGrant = cookieStore.get(getPasteAccessCookieName(slug))?.value ?? null;

  const result = await getPasteForViewer({
    slug,
    viewer,
    accessGrant,
    trackView: true
  });

  if (!result.paste) {
    return jsonError("Paste not found.", 404);
  }

  if (result.locked) {
    return jsonError("Password required.", 423, {
      requiresPassword: true
    });
  }

  return NextResponse.json(result.paste);
}
