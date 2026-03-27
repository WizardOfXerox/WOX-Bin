import type { MetadataRoute } from "next";

export const PWA_APP_NAME = "WOX-Bin";
export const PWA_SHORT_NAME = "WOX-Bin";
export const PWA_DESCRIPTION =
  "Local-first drafts, account sync, and public sharing in an installable WOX-Bin workspace.";
export const PWA_START_URL = "/app";
export const PWA_SCOPE = "/";
export const PWA_SW_PATH = "/sw.js";
export const PWA_OFFLINE_FALLBACK_URL = "/offline.html";
export const PWA_THEME_COLOR = "#0b1220";
export const PWA_BACKGROUND_COLOR = "#0b1220";

export const PWA_ICON_ENTRIES: MetadataRoute.Manifest["icons"] = [
  {
    src: "/icon-192.png",
    sizes: "192x192",
    type: "image/png"
  },
  {
    src: "/icon-512.png",
    sizes: "512x512",
    type: "image/png"
  },
  {
    src: "/icon-maskable-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable"
  },
  {
    src: "/favicon.svg",
    sizes: "any",
    type: "image/svg+xml"
  }
];

export function shouldRegisterPwaServiceWorker(protocol: string, hostname: string) {
  return protocol === "https:" || hostname === "localhost" || hostname === "127.0.0.1";
}

export function buildPwaManifest(): MetadataRoute.Manifest {
  return {
    id: PWA_SCOPE,
    name: PWA_APP_NAME,
    short_name: PWA_SHORT_NAME,
    description: PWA_DESCRIPTION,
    start_url: PWA_START_URL,
    scope: PWA_SCOPE,
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: PWA_BACKGROUND_COLOR,
    theme_color: PWA_THEME_COLOR,
    orientation: "portrait",
    categories: ["productivity", "developer", "utilities"],
    icons: PWA_ICON_ENTRIES,
    shortcuts: [
      {
        name: "Workspace",
        short_name: "Workspace",
        url: "/app",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }]
      },
      {
        name: "Quick paste",
        short_name: "Quick",
        url: "/quick",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }]
      },
      {
        name: "Privacy tools",
        short_name: "Privacy",
        url: "/privacy-tools",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }]
      }
    ]
  };
}
