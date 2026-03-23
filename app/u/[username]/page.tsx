import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { UserProfilePage } from "@/components/profile/user-profile-page";
import { getUserProfileByUsername } from "@/lib/profile-service";
import { viewerFromSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    username: string;
  }>;
};

export const metadata: Metadata = {
  title: "User profile",
  description: "Public WOX-Bin profile page with recent shared pastes and account-level paste stats."
};

export default async function UserProfileRoute({ params }: PageProps) {
  const { username: rawUsername } = await params;
  const username = rawUsername.trim().toLowerCase();
  if (!username) {
    notFound();
  }

  if (rawUsername !== username) {
    redirect(`/u/${encodeURIComponent(username)}`);
  }

  const session = await auth();
  const snapshot = await getUserProfileByUsername(username, viewerFromSession(session));
  if (!snapshot) {
    notFound();
  }

  return <UserProfilePage snapshot={snapshot} />;
}
