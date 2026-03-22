import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { PublicPasteShell } from "@/components/public-paste-shell";
import { getPasteAccessCookieName } from "@/lib/paste-access";
import { getPasteForViewer, listCommentsForPaste } from "@/lib/paste-service";
import { viewerFromSession } from "@/lib/session";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PublicPastePage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth();
  const viewer = viewerFromSession(session);
  const cookieStore = await cookies();
  const accessGrant = cookieStore.get(getPasteAccessCookieName(slug))?.value ?? null;

  const result = await getPasteForViewer({
    slug,
    viewer,
    accessGrant,
    trackView: true
  });

  if (!result.paste) {
    notFound();
  }

  const comments = result.locked
    ? []
    : await listCommentsForPaste(slug, viewer, accessGrant);

  return (
    <PublicPasteShell
      initialComments={comments}
      initialLocked={result.locked}
      initialPaste={result.paste}
      signedIn={Boolean(session?.user?.id)}
    />
  );
}
