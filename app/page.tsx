import { LandingPage } from "@/components/landing-page";
import { LegacyPasteRedirect } from "@/components/legacy-paste-redirect";

type HomePageProps = {
  searchParams: Promise<{
    p?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  if (params.p) {
    return <LegacyPasteRedirect slug={params.p} />;
  }

  return <LandingPage />;
}
