import { cookies } from "next/headers";

import { resolveUiLanguage, translate, UI_LANGUAGE_COOKIE, type TranslationKey, type UiLanguage } from "@/lib/i18n";

export async function getServerUiLanguage(): Promise<UiLanguage> {
  const cookieStore = await cookies();
  return resolveUiLanguage(cookieStore.get(UI_LANGUAGE_COOKIE)?.value);
}

export async function getServerTranslator() {
  const language = await getServerUiLanguage();
  return {
    language,
    t: (key: TranslationKey, vars?: Record<string, string | number>) => translate(language, key, vars)
  };
}
