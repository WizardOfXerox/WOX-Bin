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

export default async function SecretPastePage({ params }: PageProps) {
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

  if (!result.paste.secretMode) {
    redirect(getPasteSharePath(slug, false));
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
