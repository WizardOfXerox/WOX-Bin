"use client";

import { useLayoutEffect, useRef } from "react";

import { Prism } from "@/lib/prism-setup";
import { prismGrammarForLanguage } from "@/lib/prism-language";

import "prismjs/themes/prism-tomorrow.css";

type Props = {
  content: string;
  language: string;
};

export function PrismReadonly({ content, language }: Props) {
  const codeRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = codeRef.current;
    if (!el) {
      return;
    }

    const grammar = prismGrammarForLanguage(language, content);
    if (grammar === "plain" || !Prism.languages[grammar]) {
      el.removeAttribute("data-language");
      el.className = "block whitespace-pre-wrap break-words font-mono text-sm leading-7 text-muted-foreground";
      el.textContent = content;
      return;
    }

    el.className = `language-${grammar} block whitespace-pre-wrap break-words font-mono text-sm leading-7`;
    el.setAttribute("data-language", grammar);
    el.innerHTML = Prism.highlight(content, Prism.languages[grammar], grammar);
  }, [content, language]);

  return (
    <pre className="wox-prism-readonly overflow-auto rounded-[1.25rem] border border-white/10 bg-black/30 p-4">
      <code ref={codeRef} />
    </pre>
  );
}
