import type { Metadata } from "next";

import { Analytics } from "@vercel/analytics/next";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { ThemeRootProvider } from "@/components/providers/theme-root-provider";
import { INLINE_UI_THEME_SCRIPT } from "@/lib/ui-theme";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    default: "WOX-Bin",
    template: "%s — WOX-Bin"
  },
  description: "A Vercel-ready paste workspace with local-first drafts, account sync, and public sharing.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" }]
  }
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      data-scroll-behavior="smooth"
      data-wox-print-layout="comfortable"
      data-wox-print-wrap="1"
      lang="en"
      suppressHydrationWarning
    >
      <body>
        {/* Before paint: match localStorage + system theme so Tailwind `dark:` and `theme-light` agree */}
        <script dangerouslySetInnerHTML={{ __html: INLINE_UI_THEME_SCRIPT }} />
        <ThemeRootProvider>
          <AuthSessionProvider session={null}>{children}</AuthSessionProvider>
        </ThemeRootProvider>
        <Analytics />
      </body>
    </html>
  );
}
