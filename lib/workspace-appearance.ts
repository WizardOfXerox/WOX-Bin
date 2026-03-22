/** Prism.js theme ids — must match `prism-{id}.min.css` on the jsDelivr Prism bundle (except `tomorrow`, bundled in the editor). */
export const SYNTAX_THEMES = [
  { id: "tomorrow", label: "Tomorrow", kind: "dark" as const },
  { id: "okaidia", label: "Okaidia", kind: "dark" as const },
  { id: "twilight", label: "Twilight", kind: "dark" as const },
  { id: "dark", label: "Dark", kind: "dark" as const },
  { id: "funky", label: "Funky", kind: "dark" as const },
  { id: "coy", label: "Coy", kind: "light" as const },
  { id: "solarizedlight", label: "Solarized light", kind: "light" as const }
] as const;

export type SyntaxThemeId = (typeof SYNTAX_THEMES)[number]["id"];

const SYNTAX_IDS = new Set<string>(SYNTAX_THEMES.map((t) => t.id));

export function normalizeSyntaxTheme(id: string | null | undefined): SyntaxThemeId {
  if (id && SYNTAX_IDS.has(id)) {
    return id as SyntaxThemeId;
  }
  return "tomorrow";
}

export function isLightSyntaxTheme(id: string): boolean {
  const row = SYNTAX_THEMES.find((t) => t.id === id);
  return row?.kind === "light";
}

export type WorkspaceToneId = "default" | "deep" | "warm" | "forest";

export const WORKSPACE_TONES: { id: WorkspaceToneId; label: string }[] = [
  { id: "default", label: "Balanced" },
  { id: "deep", label: "Deep space" },
  { id: "warm", label: "Warm dusk" },
  { id: "forest", label: "Forest night" }
];

const TONE_IDS = new Set<WorkspaceToneId>(WORKSPACE_TONES.map((t) => t.id));

export function normalizeWorkspaceTone(id: string | null | undefined): WorkspaceToneId {
  if (id && TONE_IDS.has(id as WorkspaceToneId)) {
    return id as WorkspaceToneId;
  }
  return "default";
}
