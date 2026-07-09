"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  X,
  FileStack,
  FileImage,
  ImageIcon,
  Braces,
  Lock,
  ScanSearch,
  Link2,
  Vote,
  FileArchive,
  Code2,
  Merge,
  Scissors,
  FileText,
  Cpu,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Match string icons to lucide components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileStack,
  FileImage,
  ImageIcon,
  Braces,
  Lock,
  ScanSearch,
  Link2,
  Vote,
  FileArchive,
  Code2,
  Merge,
  Scissors,
  FileText
};

export type ToolItem = {
  title: string;
  description: string;
  href: string;
  iconName: string;
  category: "pdf" | "convert" | "data" | "privacy";
  isLocal: boolean;
};

type Props = {
  tools: ToolItem[];
  copy: {
    searchPlaceholder: string;
    allTools: string;
    pdfSuite: string;
    converters: string;
    dataDev: string;
    privacy: string;
    noResults: string;
    clearSearch: string;
    localExecution: string;
    serverHandoff: string;
  };
};

export function ToolsGrid({ tools, copy }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = useMemo(() => [
    { id: "all", label: copy.allTools },
    { id: "pdf", label: copy.pdfSuite },
    { id: "convert", label: copy.converters },
    { id: "data", label: copy.dataDev },
    { id: "privacy", label: copy.privacy }
  ], [copy]);

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesSearch =
        tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "all" || tool.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [tools, searchQuery, activeCategory]);

  const counts = useMemo(() => {
    const res: Record<string, number> = { all: tools.length };
    tools.forEach((t) => {
      res[t.category] = (res[t.category] || 0) + 1;
    });
    return res;
  }, [tools]);

  return (
    <div className="space-y-6">
      {/* Search and Category Filter Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 order-2 sm:order-1">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            const count = counts[cat.id] || 0;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                type="button"
                className={`relative flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 ${
                  isActive
                    ? "bg-foreground text-background border-foreground shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-105"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive ? "bg-background text-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:max-w-xs order-1 sm:order-2">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={copy.searchPlaceholder}
            className="h-9 w-full rounded-full border border-border bg-muted/30 pl-9 pr-8 text-xs outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary/50 focus:bg-muted/50 focus:ring-1 focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              type="button"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tools Grid */}
      {filteredTools.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTools.map((tool) => {
            const Icon = ICON_MAP[tool.iconName] || FileText;
            
            // Generate color palette settings based on category
            let glowColor = "hover:shadow-[0_0_24px_rgba(59,130,246,0.08)] hover:border-blue-500/25";
            let iconBg = "bg-blue-500/10 text-blue-400 dark:text-blue-300";
            if (tool.category === "pdf") {
              glowColor = "hover:shadow-[0_0_24px_rgba(239,68,68,0.08)] hover:border-red-500/25";
              iconBg = "bg-red-500/10 text-red-400 dark:text-red-300";
            } else if (tool.category === "convert") {
              glowColor = "hover:shadow-[0_0_24px_rgba(168,85,247,0.08)] hover:border-purple-500/25";
              iconBg = "bg-purple-500/10 text-purple-400 dark:text-purple-300";
            } else if (tool.category === "privacy") {
              glowColor = "hover:shadow-[0_0_24px_rgba(16,185,129,0.08)] hover:border-emerald-500/25";
              iconBg = "bg-emerald-500/10 text-emerald-400 dark:text-emerald-300";
            }

            return (
              <Link
                key={tool.href}
                href={tool.href}
                className={`glass-panel group relative flex flex-col justify-between overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-card/40 ${glowColor}`}
              >
                {/* Decorative background glow node */}
                <div className="absolute -top-12 -right-12 size-24 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors duration-300" />
                
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${iconBg}`}>
                      <Icon className="size-5" />
                    </span>
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted/40 text-muted-foreground transition-all duration-300 group-hover:bg-muted group-hover:text-foreground">
                      <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                      {tool.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {tool.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-1.5 text-[10px] font-medium tracking-wide">
                  {tool.isLocal ? (
                    <>
                      <Cpu className="size-3 text-emerald-400" />
                      <span className="text-emerald-500/90">{copy.localExecution}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-3 text-blue-400" />
                      <span className="text-blue-500/90">{copy.serverHandoff}</span>
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="glass-panel flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted/50 text-muted-foreground border border-border">
            <Search className="size-6" />
          </div>
          <h3 className="mt-4 text-lg font-semibold tracking-tight">{copy.noResults}</h3>
          <p className="mt-2 text-xs max-w-xs text-muted-foreground">
            No matching tools found for &ldquo;{searchQuery}&rdquo;. Try another search query or category filter.
          </p>
          <Button
            onClick={() => {
              setSearchQuery("");
              setActiveCategory("all");
            }}
            variant="outline"
            size="sm"
            className="mt-5 rounded-full"
          >
            {copy.clearSearch}
          </Button>
        </div>
      )}
    </div>
  );
}
