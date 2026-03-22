import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { usernameSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const form = await request.formData();
  const parsed = usernameSchema.safeParse(String(form.get("username") ?? ""));
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/account/onboarding?error=invalid", request.url));
  }

  const username = parsed.data.toLowerCase();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.username, username), eq(users.id, session.user.id)))
    .limit(2);

  if (existing && existing.id !== session.user.id) {
    return NextResponse.redirect(new URL("/account/onboarding?error=taken", request.url));
  }

  await db
    .update(users)
    .set({
      username,
      displayName: session.user.displayName ?? username,
      onboardingComplete: true,
      updatedAt: new Date()
    })
    .where(eq(users.id, session.user.id));

  return NextResponse.redirect(new URL("/app", request.url));
}
