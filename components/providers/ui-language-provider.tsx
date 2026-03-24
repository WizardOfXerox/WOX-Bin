"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  resolveUiLanguage,
  translate,
  UI_LANGUAGE_COOKIE,
  UI_LANGUAGE_STORAGE_KEY,
  type TranslationKey,
  type UiLanguage
} from "@/lib/i18n";

type UiLanguageContextValue = {
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const UiLanguageContext = createContext<UiLanguageContextValue | null>(null);

export function UiLanguageProvider({
  children,
  initialLanguage
}: {
  children: ReactNode;
  initialLanguage: UiLanguage;
}) {
  const [language, setLanguageState] = useState<UiLanguage>(() => {
    if (typeof window === "undefined") {
      return initialLanguage;
    }
    return resolveUiLanguage(window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY) ?? initialLanguage);
  });

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, language);
    document.cookie = `${UI_LANGUAGE_COOKIE}=${language}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }, [language]);

  const value = useMemo<UiLanguageContextValue>(
    () => ({
      language,
      setLanguage: (nextLanguage) => setLanguageState(resolveUiLanguage(nextLanguage)),
      t: (key, vars) => translate(language, key, vars)
    }),
    [language]
  );

  return <UiLanguageContext.Provider value={value}>{children}</UiLanguageContext.Provider>;
}

export function useUiLanguage() {
  const context = useContext(UiLanguageContext);
  if (!context) {
    throw new Error("useUiLanguage must be used inside UiLanguageProvider.");
  }
  return context;
}
