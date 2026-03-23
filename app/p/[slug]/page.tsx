import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { PublicPasteShell } from "@/components/public-paste-shell";
import { getPasteAccessCookieName, getPasteCaptchaCookieName } from "@/lib/paste-access";
import { getPasteSharePath } from "@/lib/paste-links";
import { getPasteForViewer, listCommentsForPaste } from "@/lib/paste-service";
import { viewerFromSession } from "@/lib/session";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const session = await auth();
  const viewer = viewerFromSession(session);
  const cookieStore = await cookies();
  const accessGrant = cookieStore.get(getPasteAccessCookieName(slug))?.value ?? null;
  const captchaGrant = cookieStore.get(getPasteCaptchaCookieName(slug))?.value ?? null;
  const result = await getPasteForViewer({
    slug,
    viewer,
    accessGrant,
    captchaGrant,
    trackView: false
  });

  if (!result.paste) {
    return {
      title: "Paste not found"
    };
  }

  const title = result.paste.title?.trim() || slug;
  const description = result.paste.content.trim().slice(0, 160) || "Shared paste on WOX-Bin.";

  return {
    title,
    description
  };
}

export default async function PublicPastePage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth();
  const viewer = viewerFromSession(session);
  const cookieStore = await cookies();
  const accessGrant = cookieStore.get(getPasteAccessCookieName(slug))?.value ?? null;
  const captchaGrant = cookieStore.get(getPasteCaptchaCookieName(slug))?.value ?? null;

  const result = await getPasteForViewer({
    slug,
    viewer,
    accessGrant,
    captchaGrant,
    trackView: false
  });

  if (!result.paste) {
    notFound();
  }

  if (result.paste.secretMode) {
    redirect(getPasteSharePath(slug, true));
  }

  const trackedResult = result.locked
    ? result
    : await getPasteForViewer({
        slug,
        viewer,
        accessGrant,
        captchaGrant,
        trackView: true
      });

  if (!trackedResult.paste) {
    notFound();
  }

  const comments = trackedResult.locked
    ? []
    : await listCommentsForPaste(slug, viewer, accessGrant, captchaGrant);

  return (
    <PublicPasteShell
      initialComments={comments}
      initialAccessRequirement={trackedResult.lockReason}
      initialLocked={trackedResult.locked}
      initialPaste={trackedResult.paste}
      signedIn={Boolean(session?.user?.id)}
    />
  );
}
