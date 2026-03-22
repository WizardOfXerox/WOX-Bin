import Link from "next/link";
import type { ReactNode } from "react";

const LINKS: { href: string; label: string }[] = [
  { href: "/doc", label: "Overview" },
  { href: "/doc/api", label: "API" },
  { href: "/doc/scraping", label: "Scraping & public" },
  { href: "/doc/tools", label: "Tools" },
  { href: "/doc/faq", label: "FAQ" }
];

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function DocShell({ title, subtitle, children }: Props) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-14">
        <nav aria-label="Documentation" className="mb-8 flex flex-wrap gap-2 border-b border-border pb-4 text-sm">
          {LINKS.map((item) => (
            <Link
              key={item.href}
              className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
          <span className="mx-1 text-border">|</span>
          <Link className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground" href="/">
            Home
          </Link>
          <Link className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground" href="/terms">
            Terms
          </Link>
          <Link className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground" href="/privacy">
            Privacy
          </Link>
        </nav>

        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">WOX-Bin documentation</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{subtitle}</p> : null}
        </header>

        <div className="doc-content space-y-6 text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline-offset-4 [&_a]:hover:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_h2]:mt-10 [&_h2]:scroll-mt-24 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:first:mt-0 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted/50 [&_pre]:p-4 [&_pre]:text-xs [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-foreground [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </div>
    </main>
  );
}
