import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { auth } from "@/auth";
import { getPasteForViewer } from "@/lib/paste-service";
import { jsonError } from "@/lib/http";
import { viewerFromSession } from "@/lib/session";
import { getPasteAccessCookieName } from "@/lib/paste-access";

const schema = z.object({
  password: z.string().min(1).max(128)
});

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  const viewer = viewerFromSession(session);
  const { slug } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Password is required.");
  }

  const result = await getPasteForViewer({
    slug,
    viewer,
    suppliedPassword: parsed.data.password,
    trackView: false
  });

  if (!result.paste) {
    return jsonError("Paste not found.", 404);
  }

  if (result.locked || !result.grantedAccess) {
    return jsonError("Incorrect password.", 403);
  }

  const response = NextResponse.json({ ok: true });
  const cookieStore = await cookies();
  cookieStore.set(getPasteAccessCookieName(slug), result.grantedAccess, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
    path: "/"
  });

  return response;
}
