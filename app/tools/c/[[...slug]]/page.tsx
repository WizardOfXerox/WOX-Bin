import type { Metadata } from "next";
import { redirect } from "next/navigation";

import UniversalConvertClient from "@/components/tools/universal-convert-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";
import { resolveConversionPair } from "@/lib/convert/resolver";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const raw = slug?.join("/") ?? "";
  const r = raw ? resolveConversionPair(raw) : null;
  return {
    title: r ? `${r.label} | WOX-Bin` : "Convert route | WOX-Bin",
    description: r
      ? `Convert ${r.from} to ${r.to} — browser or worker pipeline (WOX-Bin).`
      : "WOX-Bin conversion routes."
  };
}

export default async function ConvertPairPage({ params }: PageProps) {
  const { slug } = await params;
  const raw = slug?.join("/") ?? "";
  if (!raw) {
    redirect("/tools/convert");
  }

  const r = resolveConversionPair(raw);
  if (r?.appHref && (r.implementation === "client-pdf-extract" || r.implementation === "client-data-lab")) {
    redirect(r.appHref);
  }

  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <UniversalConvertClient pathSlug={raw} />
    </main>
  );
}
