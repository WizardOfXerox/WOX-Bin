import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { cookies } from "next/headers";

import { AuthSessionProvider } from "@/components/providers/session-provider";
import { PwaProvider } from "@/components/providers/pwa-provider";
import { ThemeRootProvider } from "@/components/providers/theme-root-provider";
import { UiLanguageProvider } from "@/components/providers/ui-language-provider";
import { getHtmlLang, resolveUiLanguage, UI_LANGUAGE_COOKIE } from "@/lib/i18n";
import {
  PWA_APP_NAME,
  PWA_BACKGROUND_COLOR,
  PWA_SHORT_NAME,
  PWA_THEME_COLOR
} from "@/lib/pwa";
import { INLINE_UI_THEME_SCRIPT } from "@/lib/ui-theme";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    default: "WOX-Bin",
    template: "%s — WOX-Bin"
  },
  applicationName: PWA_APP_NAME,
  description: "A Vercel-ready paste workspace with local-first drafts, account sync, and public sharing.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: PWA_SHORT_NAME
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" }]
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: PWA_THEME_COLOR },
    { media: "(prefers-color-scheme: light)", color: PWA_BACKGROUND_COLOR }
  ]
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const showVercelTelemetry = process.env.VERCEL === "1";
  const cookieStore = await cookies();
  const initialLanguage = resolveUiLanguage(cookieStore.get(UI_LANGUAGE_COOKIE)?.value);

  return (
    <html
      data-scroll-behavior="smooth"
      data-wox-print-layout="comfortable"
      data-wox-print-wrap="1"
      lang={getHtmlLang(initialLanguage)}
      suppressHydrationWarning
    >
      <body>
        {/* Before paint: match localStorage + system theme so Tailwind `dark:` and `theme-light` agree */}
        <script dangerouslySetInnerHTML={{ __html: INLINE_UI_THEME_SCRIPT }} />
        <UiLanguageProvider initialLanguage={initialLanguage}>
          <PwaProvider>
            <ThemeRootProvider>
              <AuthSessionProvider session={null}>{children}</AuthSessionProvider>
            </ThemeRootProvider>
          </PwaProvider>
        </UiLanguageProvider>
        {showVercelTelemetry ? <Analytics /> : null}
        {showVercelTelemetry ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
