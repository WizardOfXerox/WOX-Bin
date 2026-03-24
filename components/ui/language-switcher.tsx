"use client";

import { Languages } from "lucide-react";

import { useUiLanguage } from "@/components/providers/ui-language-provider";
import { UI_LANGUAGES } from "@/lib/i18n";

export function LanguageSwitcher({
  className = "",
  compact = false
}: {
  className?: string;
  compact?: boolean;
}) {
  const { language, setLanguage, t } = useUiLanguage();

  return (
    <label className={`inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground ${className}`}>
      <Languages className="h-4 w-4 shrink-0" />
      {!compact ? <span className="hidden sm:inline">{t("common.language")}</span> : null}
      <select
        aria-label={t("common.language")}
        className="min-w-0 bg-transparent text-foreground outline-none"
        onChange={(event) => setLanguage(event.target.value as (typeof UI_LANGUAGES)[number]["value"])}
        value={language}
      >
        {UI_LANGUAGES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
