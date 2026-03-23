"use client";

import { createContext, useContext } from "react";

import {
  ArrowDownAZ,
  BookTemplate,
  Bold,
  Braces,
  CalendarClock,
  CaseLower,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Code,
  Copy,
  CopyPlus,
  Fingerprint,
  Heading1,
  HelpCircle,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Layers2,
  Link2,
  List,
  ListOrdered,
  Minus,
  PanelRight,
  Printer,
  Scissors,
  Search,
  Strikethrough,
  Table,
  TextCursorInput,
  TextQuote,
  Type,
  Underline
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type RibbonTab = "home" | "insert" | "layout" | "view";

/** Browser print appearance for the paste body (see `globals.css` @media print). */
export type PrintLayoutPreset = "comfortable" | "minimal" | "document";

const RibbonCompactContext = createContext(false);

function useRibbonCompact() {
  return useContext(RibbonCompactContext);
}

type Props = {
  /** Tighter chrome when the editor pane is scrolled (sticky stack). */
  compact?: boolean;
  /** When false, text-editing actions are disabled (no paste open). */
  pasteEditable: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  tab: RibbonTab;
  onTabChange: (t: RibbonTab) => void;
  findOpen: boolean;
  onToggleFind: () => void;
  replaceOpen: boolean;
  onToggleReplace: () => void;
  mdPreviewOpen: boolean;
  onToggleMdPreview: () => void;
  onOpenTemplates: () => void;
  onOpenImportUrl: () => void;
  importUrlDisabled: boolean;
  onOpenCodeImage: () => void;
  onOpenShortcuts: () => void;
  onCopyAll: () => void;
  onSelectAll: () => void;
  onCut: () => void;
  onCopySelection: () => void;
  onPaste: () => void;
  onBold: () => void;
  onItalic: () => void;
  onInlineCode: () => void;
  onStrike: () => void;
  onUnderline: () => void;
  onInsertLink: () => void;
  onBulletList: () => void;
  onNumberList: () => void;
  onQuote: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onDuplicateBlock: () => void;
  onInsertTimestamp: () => void;
  onInsertUuid: () => void;
  onInsertHeading: () => void;
  onInsertHr: () => void;
  onInsertTable: () => void;
  onInsertCodeFence: () => void;
  onSortLines: () => void;
  onDedupeLines: () => void;
  onTrimTrailing: () => void;
  onCaseUpper: () => void;
  onCaseLower: () => void;
  onCaseTitle: () => void;
  lineNumbers: boolean;
  onToggleLineNumbers: () => void;
  wordWrap: boolean;
  onToggleWordWrap: () => void;
  /** VS Code–style active indent guides (canvas overlay); off while word wrap is on. */
  activeIndentGuides: boolean;
  onToggleActiveIndentGuides: () => void;
  fontSize: number;
  onFontSizeChange: (n: number) => void;
  onFormatJson: () => void;
  onMinifyJson: () => void;
  formatJsonDisabled?: boolean;
  onPrint: () => void;
  /** When true, long lines wrap on paper (recommended for notes / prose). */
  printWrapLongLines: boolean;
  onTogglePrintWrapLongLines: () => void;
  printLayoutPreset: PrintLayoutPreset;
  onPrintLayoutPresetChange: (preset: PrintLayoutPreset) => void;
};

function RibbonTabBtn({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  const compact = useRibbonCompact();
  return (
    <Button
      className={cn(
        "shrink-0 rounded-md",
        compact ? "h-6 px-2 text-[10px]" : "h-7 px-2.5 text-[11px]"
      )}
      onClick={onClick}
      size="sm"
      type="button"
      variant={active ? "secondary" : "ghost"}
    >
      {children}
    </Button>
  );
}

function RibbonGroup({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  const compact = useRibbonCompact();
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col border-r border-border pr-2 last:border-r-0",
        compact ? "min-w-0 gap-0" : "min-w-[72px] gap-1",
        className
      )}
    >
      <p
        className={cn(
          "select-none font-semibold uppercase tracking-widest text-muted-foreground/90",
          compact ? "sr-only" : "text-center text-[9px]"
        )}
      >
        {label}
      </p>
      <div className="flex flex-wrap justify-center gap-0.5">{children}</div>
    </div>
  );
}

function Rb({
  title,
  onClick,
  disabled,
  children,
  tutorialTarget
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  tutorialTarget?: string;
}) {
  const compact = useRibbonCompact();
  return (
    <Button
      className={cn(
        compact ? "h-7 gap-0.5 px-1 text-[9px]" : "h-8 gap-1 px-1.5 text-[10px] sm:px-2"
      )}
      data-tutorial={tutorialTarget}
      disabled={disabled}
      onClick={onClick}
      size="sm"
      title={title}
      type="button"
      variant="outline"
    >
      {children}
    </Button>
  );
}

export function WorkspaceEditorRibbon({
  pasteEditable,
  collapsed,
  onToggleCollapsed,
  tab,
  onTabChange,
  findOpen,
  onToggleFind,
  replaceOpen,
  onToggleReplace,
  mdPreviewOpen,
  onToggleMdPreview,
  onOpenTemplates,
  onOpenImportUrl,
  importUrlDisabled,
  onOpenCodeImage,
  onOpenShortcuts,
  onCopyAll,
  onSelectAll,
  onCut,
  onCopySelection,
  onPaste,
  onBold,
  onItalic,
  onInlineCode,
  onStrike,
  onUnderline,
  onInsertLink,
  onBulletList,
  onNumberList,
  onQuote,
  onIndent,
  onOutdent,
  onDuplicateBlock,
  onInsertTimestamp,
  onInsertUuid,
  onInsertHeading,
  onInsertHr,
  onInsertTable,
  onInsertCodeFence,
  onSortLines,
  onDedupeLines,
  onTrimTrailing,
  onCaseUpper,
  onCaseLower,
  onCaseTitle,
  lineNumbers,
  onToggleLineNumbers,
  wordWrap,
  onToggleWordWrap,
  activeIndentGuides,
  onToggleActiveIndentGuides,
  fontSize,
  onFontSizeChange,
  onFormatJson,
  onMinifyJson,
  formatJsonDisabled,
  onPrint,
  printWrapLongLines,
  onTogglePrintWrapLongLines,
  printLayoutPreset,
  onPrintLayoutPresetChange,
  compact = false
}: Props) {
  const dis = !pasteEditable;
  const panelPad = compact ? "px-1.5 py-1 sm:py-1.5" : "px-2 py-2 sm:py-2.5";
  const panelMax = compact ? "max-h-[128px] sm:max-h-[148px]" : "max-h-[200px]";

  return (
    <RibbonCompactContext.Provider value={compact}>
    <div
      className={cn(
        "border border-border bg-gradient-to-b from-muted/55 to-card shadow-inner transition-[border-radius] duration-200 dark:from-white/[0.05] dark:to-black/20",
        compact ? "rounded-xl" : "rounded-2xl"
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-0.5 border-b border-border transition-[padding] duration-200",
          compact ? "px-1.5 py-0.5" : "px-2 py-1"
        )}
      >
        <RibbonTabBtn active={tab === "home"} onClick={() => onTabChange("home")}>
          Home
        </RibbonTabBtn>
        <RibbonTabBtn active={tab === "insert"} onClick={() => onTabChange("insert")}>
          Insert
        </RibbonTabBtn>
        <RibbonTabBtn active={tab === "layout"} onClick={() => onTabChange("layout")}>
          Layout
        </RibbonTabBtn>
        <RibbonTabBtn active={tab === "view"} onClick={() => onTabChange("view")}>
          View
        </RibbonTabBtn>
        <div className="ml-auto flex items-center">
          <Button
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand ribbon" : "Minimize ribbon"}
            className={compact ? "h-6 w-6" : "h-7 w-7"}
            onClick={onToggleCollapsed}
            size="icon"
            type="button"
            variant="ghost"
          >
            {collapsed ? <ChevronDown className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} /> : <ChevronUp className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />}
          </Button>
        </div>
      </div>

      {!collapsed && tab === "home" ? (
        <div
          className={cn(
            "flex flex-nowrap items-start gap-1 overflow-x-auto sm:flex-wrap",
            panelMax,
            panelPad,
            !compact && "sm:max-h-none"
          )}
        >
          <RibbonGroup label="Clipboard">
            <Rb disabled={dis} onClick={onCut} title="Cut selection">
              <Scissors className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cut</span>
            </Rb>
            <Rb disabled={dis} onClick={onCopySelection} title="Copy selection">
              <Copy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Copy</span>
            </Rb>
            <Rb disabled={dis} onClick={onPaste} title="Paste from clipboard">
              <ClipboardPaste className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Paste</span>
            </Rb>
            <Rb disabled={dis} onClick={onCopyAll} title="Copy entire document">
              <Copy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Copy all</span>
            </Rb>
            <Rb disabled={dis} onClick={onSelectAll} title="Select all">
              <TextCursorInput className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Select all</span>
            </Rb>
          </RibbonGroup>

          <RibbonGroup label="Font">
            <Rb disabled={dis} onClick={onBold} title="Bold (Markdown **text**)">
              <Bold className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Bold</span>
            </Rb>
            <Rb disabled={dis} onClick={onItalic} title="Italic (*text*)">
              <Italic className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Italic</span>
            </Rb>
            <Rb disabled={dis} onClick={onUnderline} title="Underline (&lt;u&gt; in Markdown)">
              <Underline className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Underline</span>
            </Rb>
            <Rb disabled={dis} onClick={onStrike} title="Strikethrough (~~text~~)">
              <Strikethrough className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Strike</span>
            </Rb>
            <Rb disabled={dis} onClick={onInlineCode} title="Inline code (`text`)">
              <Code className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Code</span>
            </Rb>
            <Rb disabled={dis} onClick={onInsertLink} title="Insert Markdown link">
              <Link2 className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Link</span>
            </Rb>
          </RibbonGroup>

          <RibbonGroup label="Paragraph">
            <Rb disabled={dis} onClick={onBulletList} title="Bulleted list (- item)">
              <List className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Bullets</span>
            </Rb>
            <Rb disabled={dis} onClick={onNumberList} title="Numbered list">
              <ListOrdered className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Number</span>
            </Rb>
            <Rb disabled={dis} onClick={onQuote} title="Block quote (&gt;)">
              <TextQuote className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Quote</span>
            </Rb>
            <Rb disabled={dis} onClick={onIndent} title="Increase indent (Tab)">
              <IndentIncrease className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Indent</span>
            </Rb>
            <Rb disabled={dis} onClick={onOutdent} title="Decrease indent (Shift+Tab)">
              <IndentDecrease className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Outdent</span>
            </Rb>
            <Rb disabled={dis} onClick={onDuplicateBlock} title="Duplicate line or selection block">
              <CopyPlus className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Duplicate</span>
            </Rb>
          </RibbonGroup>

          <RibbonGroup label="Editing">
            <Button
              className={cn(compact ? "h-7 gap-0.5 px-1.5 text-[9px]" : "h-8 gap-1 px-1.5 text-[10px] sm:px-2")}
              disabled={dis}
              onClick={onToggleFind}
              size="sm"
              title="Find in document"
              type="button"
              variant={findOpen ? "default" : "outline"}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Find</span>
            </Button>
            <Button
              className={cn(compact ? "h-7 gap-0.5 px-1.5 text-[9px]" : "h-8 gap-1 px-1.5 text-[10px] sm:px-2")}
              disabled={dis}
              onClick={onToggleReplace}
              size="sm"
              title="Replace"
              type="button"
              variant={replaceOpen ? "default" : "outline"}
            >
              <span>Replace</span>
            </Button>
            <Rb disabled={dis} onClick={onOpenShortcuts} title="Keyboard shortcuts">
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Help</span>
            </Rb>
          </RibbonGroup>
        </div>
      ) : null}

      {!collapsed && tab === "insert" ? (
        <div
          className={cn(
            "flex flex-nowrap items-start gap-1 overflow-x-auto sm:flex-wrap",
            panelMax,
            panelPad,
            !compact && "sm:max-h-none"
          )}
        >
          <RibbonGroup label="Text">
            <Rb disabled={dis} onClick={onInsertTimestamp} title="Insert date & time">
              <CalendarClock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Date &amp; time</span>
            </Rb>
            <Rb disabled={dis} onClick={onInsertUuid} title="Insert UUID">
              <Fingerprint className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">UUID</span>
            </Rb>
            <Rb disabled={dis} onClick={onInsertHeading} title="Insert heading (# )">
              <Heading1 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Heading</span>
            </Rb>
            <Rb disabled={dis} onClick={onInsertHr} title="Horizontal rule (---)">
              <Minus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Line</span>
            </Rb>
          </RibbonGroup>

          <RibbonGroup label="Tables & code">
            <Rb disabled={dis} onClick={onInsertTable} title="Insert Markdown table">
              <Table className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Table</span>
            </Rb>
            <Rb disabled={dis} onClick={onInsertCodeFence} title="Insert fenced code block">
              <Braces className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Code block</span>
            </Rb>
            <Rb disabled={formatJsonDisabled} onClick={onFormatJson} title="Pretty-print JSON">
              <Braces className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Format JSON</span>
            </Rb>
            <Rb disabled={formatJsonDisabled} onClick={onMinifyJson} title="Minify JSON">
              <span className="font-mono text-[9px]">{`{}`}</span>
              <span className="hidden sm:inline">Minify</span>
            </Rb>
          </RibbonGroup>

          <RibbonGroup label="Illustrations">
            <Rb disabled={dis} onClick={onOpenCodeImage} title="Export code as image">
              <ImageIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Code image</span>
            </Rb>
            <Rb disabled={dis} onClick={onPrint} title="Print">
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </Rb>
          </RibbonGroup>

          <RibbonGroup label="Reuse">
            <Rb disabled={dis} onClick={onOpenTemplates} title="Templates" tutorialTarget="templates-button">
              <BookTemplate className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Templates</span>
            </Rb>
            <Rb
              disabled={importUrlDisabled}
              onClick={onOpenImportUrl}
              title={
                importUrlDisabled
                  ? "Sign in to import from Pastebin, Gist, Hastebin, and similar URLs"
                  : "Import from URL (Pastebin, Gist, Hastebin, dpaste, rentry, …)"
              }
            >
              <Link2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Import URL</span>
            </Rb>
          </RibbonGroup>
        </div>
      ) : null}

      {!collapsed && tab === "layout" ? (
        <div
          className={cn(
            "flex flex-nowrap items-start gap-1 overflow-x-auto sm:flex-wrap",
            panelMax,
            panelPad,
            !compact && "sm:max-h-none"
          )}
        >
          <RibbonGroup label="Paragraph">
            <Rb disabled={dis} onClick={onBulletList} title="Bullets">
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Bullets</span>
            </Rb>
            <Rb disabled={dis} onClick={onNumberList} title="Numbering">
              <ListOrdered className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Numbering</span>
            </Rb>
            <Rb disabled={dis} onClick={onIndent} title="Indent">
              <IndentIncrease className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Indent</span>
            </Rb>
            <Rb disabled={dis} onClick={onOutdent} title="Outdent">
              <IndentDecrease className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Outdent</span>
            </Rb>
          </RibbonGroup>

          <RibbonGroup label="Arrange">
            <Rb disabled={dis} onClick={onSortLines} title="Sort lines A→Z (selection)">
              <ArrowDownAZ className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sort lines</span>
            </Rb>
            <Rb disabled={dis} onClick={onDedupeLines} title="Remove duplicate lines (selection)">
              <Layers2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dedupe</span>
            </Rb>
            <Rb disabled={dis} onClick={onTrimTrailing} title="Trim trailing spaces (selection)">
              <Minus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Trim end</span>
            </Rb>
          </RibbonGroup>

          <RibbonGroup label="Change case">
            <Rb disabled={dis} onClick={onCaseUpper} title="UPPERCASE selection">
              <span className="font-mono text-[10px] font-bold">AA</span>
              <span className="hidden sm:inline">Upper</span>
            </Rb>
            <Rb disabled={dis} onClick={onCaseLower} title="lowercase selection">
              <CaseLower className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lower</span>
            </Rb>
            <Rb disabled={dis} onClick={onCaseTitle} title="Title Case selection">
              <Type className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Title</span>
            </Rb>
          </RibbonGroup>
        </div>
      ) : null}

      {!collapsed && tab === "view" ? (
        <div
          className={cn(
            "flex flex-wrap items-end px-2 sm:px-3",
            compact ? "gap-2 py-1.5 sm:gap-2" : "gap-3 py-2.5 sm:gap-4"
          )}
        >
          <div className={cn("flex flex-col", compact ? "gap-0" : "gap-1")}>
            <span
              className={cn(
                "font-semibold uppercase tracking-widest text-muted-foreground",
                compact ? "sr-only" : "text-[9px]"
              )}
            >
              Preview
            </span>
            <Button
              className={cn(compact ? "h-7 gap-1 px-2 text-[10px]" : "h-8 gap-1.5 px-2.5 text-xs")}
              onClick={onToggleMdPreview}
              size="sm"
              type="button"
              variant={mdPreviewOpen ? "default" : "outline"}
            >
              <PanelRight className="h-3.5 w-3.5" />
              Markdown
            </Button>
          </div>

          <Separator className={cn("hidden sm:block", compact ? "min-h-[36px]" : "min-h-[44px]")} orientation="vertical" />

          <label
            className={cn(
              "flex w-fit max-w-full shrink-0 cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-muted/40",
              compact ? "px-2 py-1.5 text-[10px]" : "px-3 py-2 text-[11px]"
            )}
          >
            <input
              checked={lineNumbers}
              className={cn(
                "shrink-0 rounded border border-input accent-primary",
                compact ? "size-3.5" : "size-4"
              )}
              onChange={() => onToggleLineNumbers()}
              type="checkbox"
            />
            <span className="whitespace-nowrap">Line #s</span>
          </label>
          <label
            className={cn(
              "flex w-fit max-w-full shrink-0 cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-muted/40",
              compact ? "px-2 py-1.5 text-[10px]" : "px-3 py-2 text-[11px]"
            )}
          >
            <input
              checked={wordWrap}
              className={cn(
                "shrink-0 rounded border border-input accent-primary",
                compact ? "size-3.5" : "size-4"
              )}
              onChange={() => onToggleWordWrap()}
              type="checkbox"
            />
            <span className="whitespace-nowrap">Wrap</span>
          </label>
          <label
            className={cn(
              "flex w-fit max-w-full shrink-0 cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-muted/40",
              compact ? "px-2 py-1.5 text-[10px]" : "px-3 py-2 text-[11px]",
              wordWrap && "opacity-50"
            )}
            title={
              wordWrap
                ? "Turn off word wrap to show active indent guides (canvas overlay)."
                : "Show VS Code–style guides only at the caret line’s indent tab stops (not CSS-only)."
            }
          >
            <input
              checked={activeIndentGuides && !wordWrap}
              className={cn(
                "shrink-0 rounded border border-input accent-primary",
                compact ? "size-3.5" : "size-4"
              )}
              disabled={wordWrap}
              onChange={() => onToggleActiveIndentGuides()}
              type="checkbox"
            />
            <span className="whitespace-nowrap">Guides</span>
          </label>

          <div className={cn("flex flex-col", compact ? "gap-0" : "gap-1")}>
            <span
              className={cn(
                "font-semibold uppercase tracking-widest text-muted-foreground",
                compact ? "sr-only" : "text-[9px]"
              )}
            >
              Font size
            </span>
            <select
              aria-label="Editor font size"
              className={cn(
                "rounded-lg border border-border bg-card/95",
                compact ? "h-7 px-1.5 text-[10px]" : "h-8 px-2 text-[11px]"
              )}
              onChange={(e) => onFontSizeChange(Number(e.target.value))}
              title="Editor font size"
              value={String(fontSize)}
            >
              {[12, 13, 14, 15, 16, 18].map((n) => (
                <option key={n} value={n}>
                  {n}px
                </option>
              ))}
            </select>
          </div>

          <Separator className={cn("hidden sm:block", compact ? "min-h-[36px]" : "min-h-[44px]")} orientation="vertical" />

          <div className={cn("flex flex-col", compact ? "gap-0" : "gap-1")}>
            <span
              className={cn(
                "font-semibold uppercase tracking-widest text-muted-foreground",
                compact ? "sr-only" : "text-[9px]"
              )}
            >
              Print
            </span>
            <label
              className={cn(
                "flex w-fit max-w-full shrink-0 cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-muted/40",
                compact ? "px-2 py-1.5 text-[10px]" : "px-3 py-2 text-[11px]"
              )}
              title="Wrap long lines when printing so prose stays inside the page margins."
            >
              <input
                checked={printWrapLongLines}
                className={cn(
                  "shrink-0 rounded border border-input accent-primary",
                  compact ? "size-3.5" : "size-4"
                )}
                onChange={() => onTogglePrintWrapLongLines()}
                type="checkbox"
              />
              <span className="whitespace-nowrap">Wrap for print</span>
            </label>
            <select
              aria-label="Print page style"
              className={cn(
                "min-w-[9.5rem] rounded-lg border border-border bg-card/95",
                compact ? "h-7 px-1.5 text-[10px]" : "h-8 px-2 text-[11px]"
              )}
              onChange={(e) => onPrintLayoutPresetChange(e.target.value as PrintLayoutPreset)}
              value={printLayoutPreset}
            >
              <option value="comfortable">Print: Comfortable box</option>
              <option value="minimal">Print: Minimal</option>
              <option value="document">Print: Document (serif)</option>
            </select>
          </div>
        </div>
      ) : null}
    </div>
    </RibbonCompactContext.Provider>
  );
}
