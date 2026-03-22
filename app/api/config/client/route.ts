import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { isSmtpConfigured } from "@/lib/mail";

/** Non-sensitive flags for the browser (avoids baking SMTP into the build). */
export async function GET() {
  return NextResponse.json({
    emailMagicLink: isSmtpConfigured(),
    googleOAuth: Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET)
  });
}
