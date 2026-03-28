import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { EncryptedSecretViewClient } from "@/components/quick-paste/encrypted-secret-view-client";
import { PublicPasteShell } from "@/components/public-paste-shell";
import { SiteHeader } from "@/components/site/site-header";
import { getPasteAccessCookieName, getPasteCaptchaCookieName } from "@/lib/paste-access";
import { getPasteSharePath } from "@/lib/paste-links";
import { getPasteForViewer, listCommentsForPaste } from "@/lib/paste-service";
import { getEncryptedSecretShareBySlug } from "@/lib/secret-share";
import { getServerUiLanguage } from "@/lib/server-i18n";
import { viewerFromSession } from "@/lib/session";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const encrypted = await getEncryptedSecretShareBySlug(slug);
  if (encrypted) {
    return {
      title: "Encrypted secret link",
      description: "Unlock this client-side encrypted WOX-Bin secret with its fragment key."
    };
  }

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
      title: "Secret link not found"
    };
  }

  const title = result.paste.title?.trim() || slug;
  const description =
    result.paste.content.trim().slice(0, 160) || "Secret link shared on WOX-Bin.";

  return {
    title,
    description
  };
}

export default async function SecretPastePage({ params }: PageProps) {
  const { slug } = await params;
  const encrypted = await getEncryptedSecretShareBySlug(slug);
  if (encrypted) {
    return (
      <main className="min-h-screen bg-background">
        <div className="absolute inset-0 bg-hero-mesh opacity-30" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-14">
          <SiteHeader className="mb-8" />
          <EncryptedSecretViewClient
            share={{
              slug: encrypted.slug,
              title: encrypted.title,
              content: encrypted.content,
              payloadCiphertext: encrypted.payloadCiphertext,
              payloadIv: encrypted.payloadIv,
              createdAt: encrypted.createdAt.toISOString(),
              expiresAt: encrypted.expiresAt?.toISOString() ?? null,
              viewCount: encrypted.viewCount,
              burnAfterRead: encrypted.burnAfterRead,
              lastViewedAt: encrypted.lastViewedAt?.toISOString() ?? null
            }}
          />
        </div>
      </main>
    );
  }

  const session = await auth();
  const language = await getServerUiLanguage();
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
      language={language}
      signedIn={Boolean(session?.user?.id)}
    />
  );
}
