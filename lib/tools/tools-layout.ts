/**
 * Shared layout classes for /tools/* pages — mobile-first padding, max width, safe gaps.
 * Use on the outer `<main>` (or root wrapper) inside `app/tools/layout.tsx`.
 */
export const TOOLS_PAGE_MAIN =
  "mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-3 py-4 sm:gap-6 sm:px-4 sm:py-6 md:px-6 md:py-8";

/** Narrow dialogs (e.g. text-convert hub) */
export const TOOLS_PAGE_MAIN_NARROW =
  "mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-3 py-4 sm:gap-6 sm:px-4 sm:py-6 md:px-6 md:py-8";

/** Simpler variant when the page is not a flex column with gaps */
export const TOOLS_PAGE_MAIN_SIMPLE =
  "mx-auto w-full max-w-5xl flex-1 px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8";

/**
 * Inner column for most tool clients (parent `<main>` already centers / max-w-5xl).
 */
export const TOOLS_CLIENT_NARROW = "flex w-full max-w-3xl flex-col gap-4 sm:gap-6";

/** Placeholder / Convertio fallback column */
export const TOOLS_CLIENT_MEDIUM = "flex w-full max-w-xl flex-col gap-4 sm:gap-6";

/** PDF extract and other wide canvases */
export const TOOLS_CLIENT_WIDE =
  "flex w-full max-w-6xl flex-col gap-4 px-0 pb-6 sm:gap-6 sm:px-2 sm:pb-10";

/** Breadcrumb row used across tool clients */
export const TOOLS_CLIENT_NAV =
  "flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground sm:gap-x-3 sm:text-sm";

/** Standard intro card */
export const TOOLS_CLIENT_HEADER = "glass-panel space-y-1.5 px-4 py-4 sm:space-y-2 sm:px-6 sm:py-5";
