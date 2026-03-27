"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";

import { PWA_SW_PATH, shouldRegisterPwaServiceWorker } from "@/lib/pwa";

type BeforeInstallPromptChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<BeforeInstallPromptChoice>;
};

type PwaInstallResult = "accepted" | "dismissed" | "unavailable";

type PwaContextValue = {
  canInstall: boolean;
  installed: boolean;
  promptInstall: () => Promise<PwaInstallResult>;
};

const PwaContext = createContext<PwaContextValue>({
  canInstall: false,
  installed: false,
  promptInstall: async () => "unavailable"
});

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    window.matchMedia?.("(display-mode: fullscreen)").matches === true ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(() => isStandaloneDisplayMode());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateInstalled = () => {
      setInstalled(isStandaloneDisplayMode());
    };

    const onBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      deferredPromptRef.current = promptEvent;
      setCanInstall(true);
    };

    const onAppInstalled = () => {
      deferredPromptRef.current = null;
      setCanInstall(false);
      setInstalled(true);
    };

    if ("serviceWorker" in navigator && shouldRegisterPwaServiceWorker(window.location.protocol, window.location.hostname)) {
      void navigator.serviceWorker.register(PWA_SW_PATH, { scope: "/" }).catch((error) => {
        console.warn("WOX-Bin PWA service worker registration failed.", error);
      });
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    window.addEventListener("pageshow", updateInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("pageshow", updateInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<PwaInstallResult> => {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) {
      return "unavailable";
    }

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    deferredPromptRef.current = null;
    setCanInstall(false);
    if (choice.outcome === "accepted") {
      setInstalled(true);
      return "accepted";
    }
    return "dismissed";
  }, []);

  const value = useMemo(
    () => ({
      canInstall,
      installed,
      promptInstall
    }),
    [canInstall, installed, promptInstall]
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa() {
  return useContext(PwaContext);
}
