import { describe, expect, it } from "vitest";

import { BUILTIN_TEMPLATES } from "@/lib/builtin-templates";
import { LANGUAGES } from "@/lib/constants";

describe("built-in templates", () => {
  it("includes the bundled megademo template", () => {
    const megademo = BUILTIN_TEMPLATES.find((template) => template.id === "megademo");

    expect(megademo).toBeDefined();
    expect(megademo?.files?.length ?? 0).toBeGreaterThan(0);
  });

  it("ships a starter template for every supported language", () => {
    const languageTemplateIds = new Set(
      BUILTIN_TEMPLATES.filter((template) => template.id.startsWith("starter-")).map((template) => template.language)
    );

    expect(languageTemplateIds.size).toBe(LANGUAGES.length);
    for (const language of LANGUAGES) {
      expect(languageTemplateIds.has(language)).toBe(true);
    }
  });
});
