import { NextResponse } from "next/server";

import { isSmtpConfigured } from "@/lib/mail";

/** Non-sensitive flags for the browser (avoids baking SMTP into the build). */
export async function GET() {
  return NextResponse.json({
    emailMagicLink: isSmtpConfigured()
  });
}
