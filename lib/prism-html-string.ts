import { Prism } from "@/lib/prism-setup";
import { prismGrammarForLanguage } from "@/lib/prism-language";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Server-safe highlighted HTML fragment (no outer document). */
export function highlightToHtmlFragment(content: string, language: string): { grammar: string; html: string } {
  const grammar = prismGrammarForLanguage(language, content);
  if (grammar === "plain" || !Prism.languages[grammar]) {
    return { grammar: "plain", html: escapeHtml(content) };
  }
  return {
    grammar,
    html: Prism.highlight(content, Prism.languages[grammar]!, grammar)
  };
}
