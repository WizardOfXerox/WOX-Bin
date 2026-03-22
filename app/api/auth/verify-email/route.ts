import { NextResponse } from "next/server";

import { verifyEmailWithToken } from "@/lib/email-verification";

export const runtime = "nodejs";

/** Email verification link from signup (SMTP). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return NextResponse.redirect(new URL("/sign-in?emailVerify=missing", request.url));
  }

  const result = await verifyEmailWithToken(token);
  if (!result.ok) {
    return NextResponse.redirect(new URL("/sign-in?emailVerify=invalid", request.url));
  }

  return NextResponse.redirect(new URL("/sign-in?emailVerify=ok", request.url));
}
