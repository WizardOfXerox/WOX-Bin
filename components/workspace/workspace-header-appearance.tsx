"use client";

import { Contrast } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SYNTAX_THEMES, WORKSPACE_TONES, type SyntaxThemeId, type WorkspaceToneId } from "@/lib/workspace-appearance";
import { UI_THEME_OPTIONS, type UiThemeMode } from "@/lib/ui-theme";

type Props = {
  className?: string;
  /** Vertical, full-width controls for narrow viewports (e.g. mobile menu). */
  stacked?: boolean;
  syntaxTheme: SyntaxThemeId;
  onSyntaxThemeChange: (id: SyntaxThemeId) => void;
  workspaceTone: WorkspaceToneId;
  onWorkspaceToneChange: (id: WorkspaceToneId) => void;
  uiTheme: UiThemeMode;
  onUiThemeChange: (mode: UiThemeMode) => void;
  appHighContrast: boolean;
  onToggleHighContrast: () => void;
};

/**
 * Appearance: app UI (dark/light/system), syntax colors, workspace backdrop, high contrast.
 * App UI is applied app-wide via ThemeRootProvider + root layout script.
 */
export function WorkspaceHeaderAppearance({
  className,
  stacked = false,
  syntaxTheme,
  onSyntaxThemeChange,
  workspaceTone,
  onWorkspaceToneChange,
  uiTheme,
  onUiThemeChange,
  appHighContrast,
  onToggleHighContrast
}: Props) {
  return (
    <div
      aria-label="Theme and appearance"
      className={cn(
        "flex flex-wrap items-center gap-x-1.5 gap-y-1 border-border sm:border-l sm:pl-2 md:gap-x-2 md:pl-3",
        stacked && "flex-col items-stretch gap-3 border-0 pl-0 sm:border-0 sm:pl-0",
        className
      )}
    >
      <span
        className={cn(
          "whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
          stacked ? "inline" : "hidden 2xl:inline"
        )}
      >
        Theme
      </span>
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-1",
          stacked && "flex-col items-stretch gap-2"
        )}
      >
        <label className="sr-only" htmlFor={stacked ? "wox-header-ui-theme-m" : "wox-header-ui-theme"}>
          App appearance
        </label>
        <select
          className={cn(
            "h-8 max-w-[6.5rem] truncate rounded-md border border-border bg-card/90 px-2 text-[11px] text-foreground shadow-sm backdrop-blur-sm sm:max-w-[8rem] sm:text-xs",
            stacked && "h-11 max-w-none text-sm"
          )}
          id={stacked ? "wox-header-ui-theme-m" : "wox-header-ui-theme"}
          onChange={(e) => onUiThemeChange(e.target.value as UiThemeMode)}
          title="Light or dark UI (whole site)"
          value={uiTheme}
        >
          {UI_THEME_OPTIONS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={stacked ? "wox-header-syntax-theme-m" : "wox-header-syntax-theme"}>
          Code syntax colors
        </label>
        <select
          className={cn(
            "h-8 max-w-[9.5rem] truncate rounded-md border border-border bg-card/90 px-2 text-[11px] text-foreground shadow-sm backdrop-blur-sm sm:max-w-[11rem] sm:text-xs",
            stacked && "h-11 max-w-none text-sm"
          )}
          id={stacked ? "wox-header-syntax-theme-m" : "wox-header-syntax-theme"}
          onChange={(e) => onSyntaxThemeChange(e.target.value as SyntaxThemeId)}
          title="Syntax highlighting theme"
          value={syntaxTheme}
        >
          {SYNTAX_THEMES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={stacked ? "wox-header-workspace-tone-m" : "wox-header-workspace-tone"}>
          Workspace background
        </label>
        <select
          className={cn(
            "h-8 max-w-[7.5rem] truncate rounded-md border border-border bg-card/90 px-2 text-[11px] text-foreground shadow-sm backdrop-blur-sm sm:max-w-[9rem] sm:text-xs",
            stacked && "h-11 max-w-none text-sm"
          )}
          id={stacked ? "wox-header-workspace-tone-m" : "wox-header-workspace-tone"}
          onChange={(e) => onWorkspaceToneChange(e.target.value as WorkspaceToneId)}
          title="Workspace background mood"
          value={workspaceTone}
        >
          {WORKSPACE_TONES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <Button
        aria-pressed={appHighContrast}
        className={cn("h-8 w-8 shrink-0 p-0", stacked && "h-11 w-11")}
        onClick={onToggleHighContrast}
        size="icon"
        title="High contrast borders"
        type="button"
        variant={appHighContrast ? "secondary" : "ghost"}
      >
        <Contrast className={cn("h-3.5 w-3.5", stacked && "h-5 w-5")} />
      </Button>
    </div>
  );
}
