import { describe, expect, it } from "vitest";

import {
  buildPwaManifest,
  PWA_OFFLINE_FALLBACK_URL,
  PWA_START_URL,
  PWA_SW_PATH,
  shouldRegisterPwaServiceWorker
} from "@/lib/pwa";

describe("pwa config", () => {
  it("builds an installable standalone manifest", () => {
    const manifest = buildPwaManifest();

    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe(PWA_START_URL);
    expect(manifest.icons?.some((icon) => icon.src === "/icon-192.png")).toBe(true);
    expect(manifest.icons?.some((icon) => icon.src === "/icon-maskable-512.png")).toBe(true);
  });

  it("registers service workers only on secure or localhost origins", () => {
    expect(shouldRegisterPwaServiceWorker("https:", "wox-bin.vercel.app")).toBe(true);
    expect(shouldRegisterPwaServiceWorker("http:", "localhost")).toBe(true);
    expect(shouldRegisterPwaServiceWorker("http:", "127.0.0.1")).toBe(true);
    expect(shouldRegisterPwaServiceWorker("http:", "192.168.0.10")).toBe(false);
  });

  it("exposes stable service worker and offline fallback routes", () => {
    expect(PWA_SW_PATH).toBe("/sw.js");
    expect(PWA_OFFLINE_FALLBACK_URL).toBe("/offline.html");
  });
});
