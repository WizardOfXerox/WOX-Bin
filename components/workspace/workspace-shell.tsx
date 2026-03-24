"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import DOMPurify from "isomorphic-dompurify";
import DiffMatchPatch from "diff-match-patch";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
} from "react";
import { flushSync } from "react-dom";

import { parseUserMarkdown } from "@/lib/markdown/parse-user-markdown";
import {
  Brackets,
  ChevronsLeft,
  ChevronsRight,
  ClipboardPaste,
  Cloud,
  Copy,
  Download,
  Eraser,
  ExternalLink,
  FileJson,
  FilePlus2,
  FileText,
  FolderInput,
  FolderPlus,
  FolderTree,
  Eye,
  EyeOff,
  GitCompare,
  Image as ImageIcon,
  Keyboard,
  KeyRound,
  LayoutTemplate,
  Link2,
  ListOrdered,
  LogOut,
  Menu,
  MoreHorizontal,
  Pencil,
  PanelLeft,
  PanelRight,
  Printer,
  Save,
  Scissors,
  Search,
  Shield,
  Share2,
  Star,
  Trash2,
  Upload,
  Video,
  WandSparkles,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";

import { PasteLineageBanner } from "@/components/paste-lineage-banner";
import { ShareAnywherePanel } from "@/components/share/share-anywhere";
import { CodeImageDialog } from "@/components/workspace/code-image-dialog";
import { PrismThemeLink } from "@/components/workspace/prism-theme-link";
import {
  PrismOverlayEditor,
  type PrismOverlayEditorHandle,
  type PrismScrollMetrics
} from "@/components/workspace/prism-overlay-editor";
import { WorkspaceHeaderAppearance } from "@/components/workspace/workspace-header-appearance";
import {
  WorkspaceEditorRibbon,
  type PrintLayoutPreset,
  type RibbonTab
} from "@/components/workspace/workspace-editor-ribbon";
import {
  findVisibleTutorialTarget,
  WorkspaceTutorial,
  type WorkspaceTutorialStep,
  type WorkspaceTutorialTour
} from "@/components/workspace/workspace-tutorial";
import { applyShiftTab, applyTab } from "@/lib/editor-indent";
import {
  isLightSyntaxTheme,
  normalizeSyntaxTheme,
  normalizeWorkspaceTone,
  type SyntaxThemeId,
  type WorkspaceToneId
} from "@/lib/workspace-appearance";
import {
  dispatchUiShellApply,
  HIGH_CONTRAST_STORAGE_KEY,
  LEGACY_APP_SHELL_LIGHT_KEY,
  parseUiThemeMode,
  resolveUiTheme,
  UI_THEME_STORAGE_KEY,
  type UiThemeMode
} from "@/lib/ui-theme";
import {
  bulletBlock,
  dedupeLinesInBlock,
  duplicateBlockLines,
  insertAtSelection,
  insertCodeFence,
  insertHorizontalRule,
  insertMarkdownTable,
  numberBlock,
  quoteBlock,
  sortLinesInBlock,
  timestampLocal,
  transformSelectionCase,
  trimTrailingInBlock,
  wrapSelection,
  type RangeEdit
} from "@/lib/ribbon-text-ops";
import { WorkspacePasteComments } from "@/components/workspace/workspace-paste-comments";
import { readTurnstileToken, resetTurnstileFields, TurnstileField } from "@/components/turnstile-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { FileDropSurface } from "@/components/ui/file-drop-surface";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { BUILTIN_TEMPLATES } from "@/lib/builtin-templates";
import {
  BURN_VIEW_OPTIONS,
  CATEGORIES,
  DEFAULT_FOLDERS,
  LANGUAGES,
  VISIBILITY_OPTIONS
} from "@/lib/constants";
import {
  addLocalFolder,
  clearAnonymousClaims,
  createEmptyPaste,
  deleteLocalFolder,
  deleteLocalPaste,
  exportLocalWorkspaceJson,
  getAnonymousClaims,
  importLocalWorkspaceJson,
  loadLocalWorkspace,
  markLocalMergeComplete,
  parseLocalWorkspaceJson,
  renameLocalFolder,
  saveLocalPaste,
  storeAnonymousClaim
} from "@/lib/local-workspace";
import { getPasteSharePath, getPasteShareUrl } from "@/lib/paste-links";
import {
  clearPasteViewHistory,
  PASTE_VIEW_HISTORY_UPDATED_EVENT,
  readPasteViewHistory,
  type PasteViewHistoryEntry
} from "@/lib/paste-view-history";
import { findBracketPairAtCursor } from "@/lib/bracket-match";
import { normalizeRawPasteFetchUrl } from "@/lib/import-paste-url";
import {
  dataUrlFromPasteFile,
  isAllowedPasteMediaMime,
  isPasteFileMedia,
  mediaKindFromMime,
  parseDataUrl
} from "@/lib/paste-file-media";
import { enrichPasteLineageForLocal } from "@/lib/paste-lineage";
import {
  isWorkspaceExportJson,
  languageFromFilename,
  titleFromImportedFilename,
  WORKSPACE_FILE_IMPORT_ACCEPT
} from "@/lib/workspace-import";
import type { AccountPlanSummary, PlanId, PlanStatus } from "@/lib/plans";
import type { LocalWorkspaceSnapshot, PasteDraft, PasteVersionDraft, PublicPasteRecord } from "@/lib/types";
import { cn, formatDate, normalizeOptionalSlug, normalizeTagList, slugify } from "@/lib/utils";

/** Sidebar folder sentinel: public feed (legacy “everyone’s public”). */
const PUBLIC_FEED_FOLDER = "__wox_public_feed__";

const STATUS_MESSAGE_AUTO_DISMISS_MS = 8000;
const ERROR_MESSAGE_AUTO_DISMISS_MS = 12000;
const MIN_WORKSPACE_ZOOM = 70;
const MAX_WORKSPACE_ZOOM = 150;
const WORKSPACE_ZOOM_STEP = 10;
const DEFAULT_WORKSPACE_ZOOM = 100;
const API_KEY_TOKEN_STORAGE_PREFIX = "woxbin_api_key_tokens";

type ListQuickFilter = "all" | "favorites" | "recent" | "archived";

function isShortcutConsumingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  return false;
}

function workspaceHeaderNavClass(active: boolean) {
  return cn(
    "rounded-md px-2 py-1.5 text-xs transition-all duration-200 ease-wox-out sm:px-2.5 sm:text-sm",
    active
      ? "bg-muted/90 font-medium text-foreground"
      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground motion-safe:hover:translate-y-px"
  );
}

function workspaceMobileNavClass(active: boolean) {
  return cn(
    "block w-full min-h-11 rounded-lg px-3 py-3 text-left text-base font-medium leading-snug transition-colors",
    active ? "bg-muted/90 text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
  );
}

/** Hysteresis for editor title ribbon — avoids compact ↔ expanded flicker when scrollTop hovers near the threshold. */
const EDITOR_SCROLL_COMPACT_ENTER = 88;
const EDITOR_SCROLL_COMPACT_EXIT = 12;

type SessionUser = {
  id: string;
  username: string | null;
  displayName: string | null;
  name: string | null;
  role: "user" | "moderator" | "admin";
  plan: PlanId;
  planStatus: PlanStatus;
};

type WorkspaceMode = "local" | "account";

type WorkspacePaste = PasteDraft & {
  commentsCount?: number;
  stars?: number;
  status?: "active" | "hidden" | "deleted";
  /**
   * Account mode: `false` until the first successful save to the server.
   * (Client `slug` is provisional until then; API delete must not be called.)
   */
  serverPersisted?: boolean;
};

function markNewAccountDraft(paste: WorkspacePaste, workspaceMode: WorkspaceMode): WorkspacePaste {
  if (workspaceMode !== "account") {
    return paste;
  }
  const normalizedSlug = normalizeOptionalSlug(paste.slug);
  const looksProvisional = !normalizedSlug || normalizedSlug === slugify(paste.id);
  return {
    ...paste,
    slug: looksProvisional ? "" : normalizedSlug,
    serverPersisted: false
  };
}

function isAccountOnlyDraft(paste: WorkspacePaste, workspaceMode: WorkspaceMode): boolean {
  return workspaceMode === "account" && paste.serverPersisted === false;
}

type FolderModalState =
  | { open: false }
  | { open: true; mode: "new" }
  | { open: true; mode: "rename"; from: string };

type MobileFolderActionsState =
  | { open: false }
  | { open: true; kind: "all" }
  | { open: true; kind: "folder"; folderName: string };

type MobilePasteActionsState =
  | { open: false }
  | { open: true; pasteId: string };

function buildPasteFingerprint(paste: WorkspacePaste) {
  return `${paste.id}|${paste.slug ?? ""}|${paste.content}|${paste.title}|${paste.visibility}|${paste.folder ?? ""}|${paste.pinned}|${paste.favorite}|${paste.archived}|${paste.template}|${paste.secretMode}|${paste.captchaRequired}|${JSON.stringify(paste.files)}`;
}

type WorkspaceSnapshot = {
  folders: string[];
  pastes: WorkspacePaste[];
};

type AccountWorkspaceResponse = {
  folders: string[];
  pastes: PublicPasteRecord[];
  plan: AccountPlanSummary;
};

type SavePasteResponse = {
  paste: PublicPasteRecord;
  plan: AccountPlanSummary;
};

type ApiKeyRecord = {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  token?: string | null;
};

type ApiKeyCreateResponse = {
  key: ApiKeyRecord & {
    token: string;
  };
  plan: AccountPlanSummary;
};

type MutationPlanResponse = {
  ok: true;
  plan: AccountPlanSummary;
};

type Props = {
  sessionUser: SessionUser | null;
  /** Open workspace with a fork draft of this public slug (consumed once after load). */
  initialForkSlug?: string;
  initialTutorialRequested?: boolean;
};

function sortPastes(pastes: WorkspacePaste[]) {
  return [...pastes].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

type SortOrder = "pinned_updated" | "newest" | "oldest" | "title" | "updated";

const TUTORIAL_STORAGE_PREFIX = "woxbin_workspace_tutorial_seen";

type TutorialTourBlueprint = {
  id: string;
  label: string;
  description: string;
  stepIds: string[];
};

const DESKTOP_TUTORIAL_STEPS: WorkspaceTutorialStep[] = [
  {
    id: "nav",
    targetId: "workspace-nav",
    title: "Workspace shell and site navigation",
    description: "This header keeps the workspace connected to the rest of the product instead of trapping you inside one editor view.",
    bullets: [
      "Use Home, Feed, Archive, Help, Support, and Settings without losing your current place in the workspace.",
      "This is also the fastest way to jump between authoring, public browsing, and account/support surfaces.",
      "The Tutorial button can reopen any tour later, so onboarding does not have to be one-and-done."
    ],
    emphasis: "Treat the header as the route map for the product. The editor is central, but it is not the whole app."
  },
  {
    id: "library",
    targetId: "library-sidebar",
    title: "Library, folders, and search",
    description: "This sidebar is the control center for your workspace. It is where you search, filter, batch-manage, import, and open pastes.",
    bullets: [
      "Use search to scan titles, content, and tags across the current workspace.",
      "Folders, quick filters, and sort order shape what you are looking at before you edit anything.",
      "Import and export live at the bottom of the library so backups stay close to the source list."
    ],
    emphasis: "The fastest way to move around WOX-Bin is: filter in the library, open the paste, then work in the editor."
  },
  {
    id: "editor",
    targetId: "editor-main",
    title: "Main editor surface",
    description: "This is the primary editing area. WOX-Bin treats it as the working document, not a tiny form field.",
    bullets: [
      "Write plain text, code, Markdown, notes, or structured data directly in the editor.",
      "The ribbon above the editor exposes formatting, JSON tools, find/replace, printing, and code image export.",
      "Your selected paste stays loaded here while the side panels handle organization and metadata."
    ],
    emphasis: "If you can see the editor, you are in the part of the app that matters most. Everything else exists to support this surface."
  },
  {
    id: "templates",
    targetId: "templates-button",
    title: "Templates and reusable starters",
    description: "Templates let you start from structure instead of a blank page.",
    bullets: [
      "Built-in starters cover supported languages and the full WOX-Bin megademo example.",
      "Your own pastes can become reusable templates with the “Save as template” toggle in details.",
      "Templates can carry content, files, tags, and folder defaults so repeat work stays fast."
    ],
    emphasis: "New accounts start with the big example paste so you can inspect a full-featured document immediately."
  },
  {
    id: "files",
    targetId: "files-section",
    title: "Files, attachments, and media",
    description: "A paste can be more than one body field. This section lets you attach extra files and media directly to the paste.",
    bullets: [
      "Add extra text/code files for multi-file snippets or grouped references.",
      "Drag images or videos into the drop zone to attach visual context.",
      "Attachments count toward plan limits, so this area is also where hosted size usage becomes visible."
    ],
    emphasis: "Use this when one paste needs related assets, not when you want to split work into separate pastes."
  },
  {
    id: "details",
    targetId: "details-panel",
    title: "Sharing, privacy, and advanced settings",
    description: "The details panel is where a draft becomes a managed share with URL, privacy, and lifecycle controls.",
    bullets: [
      "Visibility, Pro or Team custom URLs, category, tags, password, burn rules, Turnstile-before-view, versioning, and template status all live here.",
      "This is also where you switch between normal sharing and secret-link behavior, then copy the resulting URL after save.",
      "Folder assignment and metadata stay separate from the editor so the writing surface stays clean."
    ],
    emphasis: "If a paste needs to be private, public, secret, protected, pinned, or reusable, this panel is where you do it."
  },
  {
    id: "comments",
    targetId: "comments-section",
    title: "Comments, replies, and support flow",
    description: "WOX-Bin supports threaded comment discussion on saved pastes, and support/help live in the same product surface rather than outside it.",
    bullets: [
      "Saved hosted pastes can receive comments and comment replies from signed-in users.",
      "Use Help for documented answers, Support for real tickets with screenshots, and the quick-share routes when the full workspace is unnecessary.",
      "If you are publishing something public-facing, this is the collaboration layer that sits below the content."
    ],
    emphasis: "You can reopen this tutorial later from the Tutorial button in the workspace header."
  }
];

function buildTutorialTours(steps: WorkspaceTutorialStep[], blueprints: TutorialTourBlueprint[]): WorkspaceTutorialTour[] {
  const stepMap = new Map(steps.map((step) => [step.id, step] as const));
  return blueprints
    .map((tour) => ({
      id: tour.id,
      label: tour.label,
      description: tour.description,
      steps: tour.stepIds
        .map((stepId) => stepMap.get(stepId))
        .filter((step): step is WorkspaceTutorialStep => Boolean(step))
    }))
    .filter((tour) => tour.steps.length > 0);
}

const DESKTOP_TUTORIAL_TOURS = buildTutorialTours(DESKTOP_TUTORIAL_STEPS, [
  {
    id: "basics",
    label: "Basics",
    description: "Start here for the workspace shell, library, and editor surface.",
    stepIds: ["nav", "library", "editor"]
  },
  {
    id: "authoring",
    label: "Authoring",
    description: "Templates, ribbon-driven writing, and multi-file paste structure.",
    stepIds: ["templates", "files"]
  },
  {
    id: "sharing",
    label: "Sharing",
    description: "Privacy, paid custom URLs, secret links, and publish-time controls.",
    stepIds: ["details"]
  },
  {
    id: "collaboration",
    label: "Collaboration",
    description: "Comments, support surfaces, and the handoff layer around a saved paste.",
    stepIds: ["comments"]
  }
]);

const MOBILE_TUTORIAL_STEPS: WorkspaceTutorialStep[] = [
  {
    id: "library-mobile",
    targetId: "library-button",
    title: "Library access on mobile",
    description: "On phones the editor stays primary, so the library moves behind this button instead of permanently taking screen space.",
    bullets: [
      "Tap Library to browse folders, search, import, export, and open other pastes.",
      "This keeps the editing surface visible instead of compressing the app into stacked panels.",
      "The same workspace data is available here; only the layout changes."
    ],
    emphasis: "Mobile prioritizes editing first. Use the library when you need to navigate, then return to the editor."
  },
  {
    id: "editor-mobile",
    targetId: "editor-main",
    title: "Editor-first mobile workspace",
    description: "The editor is the main screen on mobile. That is intentional: the most important action should remain visible and usable.",
    bullets: [
      "Write and edit directly here without sidebars fighting for vertical space.",
      "The ribbon still gives you formatting, JSON actions, templates, and code image export.",
      "The bottom bar keeps the high-frequency actions close to your thumb."
    ],
    emphasis: "If you are working from a phone, this is the page state you should spend most of your time in."
  },
  {
    id: "templates-mobile",
    targetId: "templates-button",
    title: "Templates on mobile",
    description: "Templates are still available on mobile through the editor ribbon.",
    bullets: [
      "Use built-in language starters or the WOX-Bin megademo when you need a structured starting point.",
      "Your own saved templates appear in the same dialog as built-ins.",
      "This is the fastest path when you know the kind of paste you are about to create and do not want to start from a blank draft."
    ],
    emphasis: "The tutorial keeps the target focused so you can learn the mobile control layout without losing context."
  },
  {
    id: "files-mobile",
    targetId: "files-section",
    title: "Attachments and media on mobile",
    description: "Files and media are handled inline under the editor so you can keep the paste and its assets together.",
    bullets: [
      "Attach additional files when a paste needs more than one document.",
      "Upload screenshots or media when support, documentation, or demos need visual proof.",
      "This section is also where multi-file examples become reusable templates."
    ],
    emphasis: "If you need a richer paste than just one block of text, this is the section to use."
  },
  {
    id: "details-mobile",
    targetId: "details-button",
    title: "Advanced settings on demand",
    description: "On mobile, advanced settings open from this Details button instead of staying docked on screen.",
    bullets: [
      "Tap it for visibility, paid custom URLs, password, tags, folder, versions, secret-link mode, and sharing controls.",
      "This keeps the core editor clean while still exposing the full hosted feature set.",
      "The same privacy and publishing controls are available here as on desktop."
    ],
    emphasis: "When you want to publish, protect, pin, template, or share a paste from a phone, use Details."
  },
  {
    id: "comments-mobile",
    targetId: "comments-section",
    title: "Comments and help surfaces",
    description: "Below the paste, WOX-Bin keeps discussion and support close to the content instead of sending users off-platform.",
    bullets: [
      "Saved hosted pastes can receive threaded comments and replies.",
      "Help documents known answers; Support opens an actual ticket when you need staff action.",
      "The Tutorial button remains available in the header so you can rerun this guide later."
    ],
    emphasis: "That is the full working loop: navigate, edit, attach, configure, publish, then discuss or request help."
  }
];

const MOBILE_TUTORIAL_TOURS = buildTutorialTours(MOBILE_TUTORIAL_STEPS, [
  {
    id: "basics",
    label: "Basics",
    description: "Phone-first workspace layout: library access plus the editor as the primary surface.",
    stepIds: ["library-mobile", "editor-mobile"]
  },
  {
    id: "authoring",
    label: "Authoring",
    description: "Templates and attachments without leaving the editor-first mobile layout.",
    stepIds: ["templates-mobile", "files-mobile"]
  },
  {
    id: "sharing",
    label: "Sharing",
    description: "Where publishing, secret links, and advanced settings live on mobile.",
    stepIds: ["details-mobile"]
  },
  {
    id: "collaboration",
    label: "Collaboration",
    description: "Comments, help, and support after a paste is saved and shared.",
    stepIds: ["comments-mobile"]
  }
]);

function tutorialStorageKey(userId: string) {
  return `${TUTORIAL_STORAGE_PREFIX}:${userId}`;
}

function apiKeyTokenStorageKey(userId: string) {
  return `${API_KEY_TOKEN_STORAGE_PREFIX}:${userId}`;
}

function readRememberedApiKeyTokens(userId: string | null | undefined): Record<string, string> {
  if (typeof window === "undefined" || !userId) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(apiKeyTokenStorageKey(userId));
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string" && entry[1].length > 0)
    );
  } catch {
    return {};
  }
}

function writeRememberedApiKeyTokens(userId: string | null | undefined, tokens: Record<string, string>) {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  if (Object.keys(tokens).length === 0) {
    window.localStorage.removeItem(apiKeyTokenStorageKey(userId));
    return;
  }

  window.localStorage.setItem(apiKeyTokenStorageKey(userId), JSON.stringify(tokens));
}

function rememberApiKeyToken(userId: string | null | undefined, keyId: string, token: string) {
  if (!userId || !keyId || !token) {
    return;
  }

  writeRememberedApiKeyTokens(userId, {
    ...readRememberedApiKeyTokens(userId),
    [keyId]: token
  });
}

function forgetRememberedApiKeyToken(userId: string | null | undefined, keyId: string) {
  if (!userId || !keyId) {
    return;
  }

  const next = { ...readRememberedApiKeyTokens(userId) };
  delete next[keyId];
  writeRememberedApiKeyTokens(userId, next);
}

function applySidebarSort(pastes: WorkspacePaste[], order: SortOrder): WorkspacePaste[] {
  if (order === "pinned_updated") {
    return sortPastes(pastes);
  }

  const pinned = pastes.filter((p) => p.pinned);
  const unpinned = pastes.filter((p) => !p.pinned);

  const sortSegment = (items: WorkspacePaste[]) => {
    const copy = [...items];
    switch (order) {
      case "newest":
        copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        copy.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "title":
        copy.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "updated":
        copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      default:
        break;
    }
    return copy;
  };

  return [...sortSegment(pinned), ...sortSegment(unpinned)];
}

function normalizeRemotePaste(paste: PublicPasteRecord): WorkspacePaste {
  return {
    ...paste,
    password: null,
    forkedFromId: paste.forkedFromId ?? null,
    replyToId: paste.replyToId ?? null,
    forkedFrom: paste.forkedFrom ?? null,
    replyTo: paste.replyTo ?? null,
    serverPersisted: true
  };
}

function sanitizeSnapshot(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
  return {
    folders: Array.from(
      new Set([
        ...DEFAULT_FOLDERS,
        ...(snapshot.folders || []),
        ...snapshot.pastes
          .map((paste) => paste.folder)
          .filter((value): value is string => Boolean(value))
      ])
    ),
    pastes: sortPastes(snapshot.pastes)
  };
}

function buildAccountImportDrafts(snapshot: LocalWorkspaceSnapshot): WorkspacePaste[] {
  return snapshot.pastes.map((paste) =>
    markNewAccountDraft(
      createEmptyPaste({
        ...paste,
        id: undefined,
        slug: undefined,
        viewCount: 0,
        visibility: paste.secretMode ? "unlisted" : paste.visibility,
        password: null
      }) as WorkspacePaste,
      "account"
    )
  );
}

function buildPastePayload(paste: WorkspacePaste) {
  const requestedSlug = normalizeOptionalSlug(paste.slug);
  return {
    id: paste.id,
    slug: requestedSlug || undefined,
    title: paste.title,
    content: paste.content,
    language: paste.language,
    folderName: paste.folder,
    category: paste.category,
    tags: normalizeTagList(paste.tags),
    visibility: paste.visibility,
    password: paste.password,
    secretMode: paste.secretMode,
    captchaRequired: paste.captchaRequired,
    burnAfterRead: paste.burnAfterRead,
    burnAfterViews: paste.burnAfterViews,
    pinned: paste.pinned,
    favorite: paste.favorite,
    archived: paste.archived,
    template: paste.template,
    forkedFromId: paste.forkedFromId ?? null,
    replyToId: paste.replyToId ?? null,
    expiresAt: paste.expiresAt,
    files: paste.files
  };
}

/** New paste copied from `src`, with fork lineage (same content/files). */
function buildForkFromSource(src: WorkspacePaste, workspaceMode: WorkspaceMode): WorkspacePaste {
  const next = createEmptyPaste({
    ...src,
    id: undefined,
    slug: undefined,
    title: `Fork of ${src.title}`,
    forkedFromId: src.id,
    forkedFrom: { slug: src.slug, title: src.title },
    replyToId: null,
    replyTo: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }) as WorkspacePaste;
  return markNewAccountDraft(next, workspaceMode);
}

function createDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatPlanName(plan: PlanId) {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function formatPlanStatus(status: PlanStatus) {
  return status.replace("_", " ");
}

function clampWorkspaceZoom(value: number) {
  return Math.max(MIN_WORKSPACE_ZOOM, Math.min(MAX_WORKSPACE_ZOOM, Math.round(value)));
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function ShareBuilderPanel({
  slug,
  secretMode,
  lineStart,
  lineEnd,
  onLineStartChange,
  onLineEndChange
}: {
  slug: string;
  secretMode: boolean;
  lineStart: string;
  lineEnd: string;
  onLineStartChange: (v: string) => void;
  onLineEndChange: (v: string) => void;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const base = getPasteShareUrl(origin, slug, secretMode);
  const n = lineStart.trim() ? Math.max(1, Number.parseInt(lineStart, 10) || 1) : 0;
  const m = lineEnd.trim() ? Math.max(n, Number.parseInt(lineEnd, 10) || n) : n;
  const hash =
    n > 0
      ? m > n
        ? `#line-${n}` /* PrismLineMap uses single-line ids; first line of range for scroll */
        : `#line-${n}`
      : "";
  const shareUrl = `${base}${hash}`;
  const rawUrl = `${origin}/raw/${slug}`;
  const roUrl = `${shareUrl}${shareUrl.includes("?") ? "&" : "?"}readonly=1`;
  const iframeSnippet = `<iframe src="${shareUrl}" title="Paste" style="width:100%;min-height:320px;border:1px solid #ccc;border-radius:8px;"></iframe>`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="wox-share-line-a">
            Line from (optional)
          </label>
          <Input
            className="mt-1"
            id="wox-share-line-a"
            inputMode="numeric"
            onChange={(e) => onLineStartChange(e.target.value)}
            placeholder="e.g. 12"
            value={lineStart}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="wox-share-line-b">
            Line to (optional)
          </label>
          <Input
            className="mt-1"
            id="wox-share-line-b"
            inputMode="numeric"
            onChange={(e) => onLineEndChange(e.target.value)}
            placeholder="e.g. 40"
            value={lineEnd}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Public pages use <code className="rounded bg-muted px-1">#line-N</code> anchors. A range scrolls to the first line in the
        URL.
      </p>

      <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
        <p className="text-xs font-medium text-muted-foreground">{secretMode ? "Secret link URL" : "Share URL"}</p>
        <p className="break-all font-mono text-xs text-foreground">{shareUrl}</p>
        <Button
          onClick={() => void navigator.clipboard.writeText(shareUrl)}
          size="sm"
          type="button"
          variant="outline"
        >
          Copy
        </Button>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
        <p className="text-xs font-medium text-muted-foreground">Raw URL</p>
        <p className="break-all font-mono text-xs text-foreground">{rawUrl}</p>
        <Button onClick={() => void navigator.clipboard.writeText(rawUrl)} size="sm" type="button" variant="outline">
          Copy raw
        </Button>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
        <p className="text-xs font-medium text-muted-foreground">Share anywhere</p>
        <ShareAnywherePanel
          className="pt-1"
          rawUrl={rawUrl}
          text={`${secretMode ? "Shared secret link" : "Shared paste"} on WOX-Bin`}
          title={slug}
          url={shareUrl}
        />
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
        <p className="text-xs font-medium text-muted-foreground">Read-only hint URL</p>
        <p className="break-all font-mono text-xs text-foreground">{roUrl}</p>
        <p className="text-xs text-muted-foreground">Append for hosts that honor a read-only flag (parity with legacy links).</p>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
        <p className="text-xs font-medium text-muted-foreground">iframe embed</p>
        <textarea
          aria-label="iframe embed HTML snippet"
          className="min-h-[72px] w-full rounded-lg border border-border bg-muted p-2 font-mono text-xs dark:bg-black/40"
          readOnly
          title="iframe embed HTML snippet"
          value={iframeSnippet}
        />
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
        <p className="text-xs font-medium text-muted-foreground">QR (external)</p>
        {origin ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="QR code for paste URL" className="rounded-lg border border-border bg-white p-2" height={140} src={qrSrc} width={140} />
        ) : null}
      </div>
    </div>
  );
}

function usageWidth(used: number, limit: number) {
  if (!limit) {
    return "0%";
  }

  return `${Math.min(100, Math.round((used / limit) * 100))}%`;
}

export function WorkspaceShell({ sessionUser, initialForkSlug, initialTutorialRequested = false }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mode, setMode] = useState<WorkspaceMode>(sessionUser ? "account" : "local");
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>({
    folders: DEFAULT_FOLDERS,
    pastes: []
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [localImportCount, setLocalImportCount] = useState(0);
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [revealedApiKeyIds, setRevealedApiKeyIds] = useState<Set<string>>(() => new Set());
  const [accountPlan, setAccountPlan] = useState<AccountPlanSummary | null>(null);
  const [apiKeyLabel, setApiKeyLabel] = useState("CLI Upload");
  const [viewHistory, setViewHistory] = useState<PasteViewHistoryEntry[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [sidebarFolder, setSidebarFolder] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("pinned_updated");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findMatchIndex, setFindMatchIndex] = useState(0);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceFind, setReplaceFind] = useState("");
  const [replaceWith, setReplaceWith] = useState("");
  const [mdPreviewOpen, setMdPreviewOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [importUrlOpen, setImportUrlOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importUrlBusy, setImportUrlBusy] = useState(false);
  const [codeImageOpen, setCodeImageOpen] = useState(false);
  const [diffVersion, setDiffVersion] = useState<PasteVersionDraft | null>(null);
  /** Default collapsed so mobile gets the editor first; desktop prefs applied in hydrate effect. */
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(true);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(true);
  const [ribbonCollapsed, setRibbonCollapsed] = useState(false);
  const [ribbonTab, setRibbonTab] = useState<RibbonTab>("home");
  const [syntaxTheme, setSyntaxTheme] = useState<SyntaxThemeId>("tomorrow");
  const [workspaceTone, setWorkspaceTone] = useState<WorkspaceToneId>("default");
  const [editorFontSize, setEditorFontSize] = useState(15);
  const [pageZoom, setPageZoom] = useState(DEFAULT_WORKSPACE_ZOOM);
  const [editorLineNumbers, setEditorLineNumbers] = useState(true);
  const [editorWordWrap, setEditorWordWrap] = useState(false);
  const [editorActiveIndentGuides, setEditorActiveIndentGuides] = useState(false);
  const [printWrapLongLines, setPrintWrapLongLines] = useState(true);
  const [printLayoutPreset, setPrintLayoutPreset] = useState<PrintLayoutPreset>("comfortable");
  const [listQuickFilter, setListQuickFilter] = useState<ListQuickFilter>("all");
  const [publicFeedPastes, setPublicFeedPastes] = useState<WorkspacePaste[]>([]);
  const [publicFeedLoading, setPublicFeedLoading] = useState(false);
  const [publicFeedError, setPublicFeedError] = useState<string | null>(null);
  const [quickOpenOpen, setQuickOpenOpen] = useState(false);
  const [quickOpenQuery, setQuickOpenQuery] = useState("");
  const [autosaveHint, setAutosaveHint] = useState<"idle" | "pending" | "saved">("idle");
  const [shareBuilderOpen, setShareBuilderOpen] = useState(false);
  const [shareLineStart, setShareLineStart] = useState("");
  const [shareLineEnd, setShareLineEnd] = useState("");
  /** SSR-safe default; synced from localStorage in useLayoutEffect before paint. */
  const [uiTheme, setUiTheme] = useState<UiThemeMode>("dark");
  const [appHighContrast, setAppHighContrast] = useState(false);
  const skipNextWorkspacePersist = useRef(true);
  const [batchSelected, setBatchSelected] = useState<Set<string>>(() => new Set());
  const [batchMoveOpen, setBatchMoveOpen] = useState(false);
  const [batchMoveFolder, setBatchMoveFolder] = useState("");
  const [folderDraftMode, setFolderDraftMode] = useState(false);
  const [folderModal, setFolderModal] = useState<FolderModalState>({ open: false });
  const [folderModalName, setFolderModalName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteMediaFileInputRef = useRef<HTMLInputElement>(null);
  const [pasteMediaAttachIndex, setPasteMediaAttachIndex] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mainEditorRef = useRef<PrismOverlayEditorHandle>(null);
  const editorPaneScrollRef = useRef<HTMLDivElement>(null);
  const [editorPaneCompact, setEditorPaneCompact] = useState(false);
  const [workspaceMobileMenuOpen, setWorkspaceMobileMenuOpen] = useState(false);
  const [phoneViewport, setPhoneViewport] = useState(false);
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [mobileFolderActions, setMobileFolderActions] = useState<MobileFolderActionsState>({ open: false });
  const [mobilePasteActions, setMobilePasteActions] = useState<MobilePasteActionsState>({ open: false });
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  /** Mobile: editor uses transparent text over Prism — need ≥16px to avoid iOS zoom and keep overlay aligned. */
  const [narrowEditorViewport, setNarrowEditorViewport] = useState(false);
  const mdPreviewRef = useRef<HTMLDivElement>(null);
  const mdScrollLock = useRef<"editor" | "preview" | null>(null);
  const lastAutosaveFingerprintRef = useRef("");
  const selectedPasteRef = useRef<WorkspacePaste | null>(null);
  const deferredSearch = useDeferredValue(search);
  const effectiveEditorFontPx = narrowEditorViewport ? Math.max(editorFontSize, 16) : editorFontSize;
  const workspaceZoomFactor = pageZoom / 100;
  const workspaceOuterVerticalPadding = phoneViewport ? "0.75rem" : "1.5rem";
  const workspaceViewportStyle =
    pageZoom === DEFAULT_WORKSPACE_ZOOM
      ? undefined
      : ({
          transform: `scale(${workspaceZoomFactor})`,
          transformOrigin: "top left",
          width: `${(100 / workspaceZoomFactor).toFixed(4)}%`,
          height: `calc((100dvh - ${workspaceOuterVerticalPadding}) / ${workspaceZoomFactor})`,
          minHeight: `calc((100dvh - ${workspaceOuterVerticalPadding}) / ${workspaceZoomFactor})`,
          maxHeight: `calc((100dvh - ${workspaceOuterVerticalPadding}) / ${workspaceZoomFactor})`
        } as CSSProperties);
  const sessionUserId = sessionUser?.id;
  const lastForkImportKeyRef = useRef<string | null>(null);
  const forkImportInFlightRef = useRef<string | null>(null);
  const tutorialAutoOpenHandledRef = useRef(false);
  const tutorialTours = useMemo(() => (phoneViewport ? MOBILE_TUTORIAL_TOURS : DESKTOP_TUTORIAL_TOURS), [phoneViewport]);
  const [tutorialTourId, setTutorialTourId] = useState<string>(tutorialTours[0]?.id ?? "basics");
  const activeTutorialTour = useMemo(
    () => tutorialTours.find((tour) => tour.id === tutorialTourId) ?? tutorialTours[0] ?? null,
    [tutorialTourId, tutorialTours]
  );
  const tutorialSteps = useMemo(() => activeTutorialTour?.steps ?? [], [activeTutorialTour]);

  useEffect(() => {
    if (!tutorialTours.length) {
      return;
    }
    if (!tutorialTours.some((tour) => tour.id === tutorialTourId)) {
      setTutorialTourId(tutorialTours[0]!.id);
      setTutorialStepIndex(0);
    }
  }, [tutorialTourId, tutorialTours]);

  const changeTutorialTour = useCallback((tourId: string) => {
    setTutorialTourId(tourId);
    setTutorialStepIndex(0);
  }, []);

  const openTutorial = useCallback((tourOrStep: string | number = tutorialTours[0]?.id ?? "basics", maybeStep = 0) => {
    const nextTourId = typeof tourOrStep === "string" ? tourOrStep : tutorialTours[0]?.id ?? "basics";
    const nextStep = typeof tourOrStep === "number" ? tourOrStep : maybeStep;
    setWorkspaceMobileMenuOpen(false);
    setTutorialTourId(nextTourId);
    const targetTour = tutorialTours.find((tour) => tour.id === nextTourId) ?? tutorialTours[0] ?? null;
    const maxIndex = Math.max((targetTour?.steps.length ?? 1) - 1, 0);
    setTutorialStepIndex(Math.max(0, Math.min(nextStep, maxIndex)));
    setTutorialOpen(true);
  }, [tutorialTours]);

  const markTutorialSeen = useCallback(() => {
    if (typeof window === "undefined" || !sessionUserId) {
      return;
    }
    window.localStorage.setItem(tutorialStorageKey(sessionUserId), "1");
  }, [sessionUserId]);

  const closeTutorial = useCallback(
    (completed: boolean) => {
      setTutorialOpen(false);
      if (completed || sessionUserId) {
        markTutorialSeen();
      }
    },
    [markTutorialSeen, sessionUserId]
  );

  async function loadAccountWorkspace() {
    const [workspaceResponse, keysResponse, localResult] = await Promise.all([
      fetch("/api/workspace/pastes", { cache: "no-store" }),
      fetch("/api/workspace/keys", { cache: "no-store" }),
      loadLocalWorkspace().catch(() => null)
    ]);

    const workspaceRaw = await workspaceResponse.json().catch(() => null) as
      | AccountWorkspaceResponse
      | { error?: string }
      | null;

    if (!workspaceResponse.ok) {
      const apiMsg =
        workspaceRaw && typeof workspaceRaw === "object" && "error" in workspaceRaw && workspaceRaw.error
          ? String(workspaceRaw.error)
          : `HTTP ${workspaceResponse.status}`;
      throw new Error(apiMsg);
    }

    const workspaceData = workspaceRaw as AccountWorkspaceResponse;

    const keysData = keysResponse.ok
      ? ((await keysResponse.json()) as { keys: ApiKeyRecord[] })
      : { keys: [] };
    const rememberedApiKeyTokens = readRememberedApiKeyTokens(sessionUserId);

    if (localResult) {
      const lastMergedAt = localResult.meta.lastMergedAt ? new Date(localResult.meta.lastMergedAt).getTime() : 0;
      const draftCount = localResult.snapshot.pastes.filter(
        (paste) =>
          (!paste.id.startsWith("example-") || Boolean(localResult.meta.importedLegacyAt)) &&
          (!lastMergedAt || new Date(paste.updatedAt).getTime() > lastMergedAt)
      ).length;
      setLocalImportCount(draftCount);
    }

    setApiKeys((current) =>
      keysData.keys.map((entry) => ({
        ...entry,
        token:
          current.find((currentEntry) => currentEntry.id === entry.id)?.token ??
          rememberedApiKeyTokens[entry.id] ??
          null
      }))
    );
    setAccountPlan(workspaceData.plan);
    setSnapshot((current) => {
      const serverPastes = workspaceData.pastes.map(normalizeRemotePaste);
      const accountOnlyDrafts = current.pastes.filter((p) => p.serverPersisted === false);
      return sanitizeSnapshot({
        folders: workspaceData.folders,
        pastes: [...accountOnlyDrafts, ...serverPastes]
      });
    });
  }

  async function loadLocalDrafts() {
    const local = await loadLocalWorkspace();
    setSnapshot(
      sanitizeSnapshot({
        folders: local.snapshot.folders,
        pastes: local.snapshot.pastes
      })
    );
  }

  async function claimAnonymousDrafts() {
    if (!sessionUser) {
      return;
    }

    const claims = await getAnonymousClaims().catch(() => []);
    if (!claims.length) {
      return;
    }

    const response = await fetch("/api/account/claim-anonymous", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: claims.map((claim) => ({
          slug: claim.slug,
          token: claim.token
        }))
      })
    });

    if (!response.ok) {
      return;
    }

    await clearAnonymousClaims(claims.map((claim) => claim.slug));
    setStatus(`Claimed ${claims.length} anonymously published paste${claims.length === 1 ? "" : "s"} into your account.`);
  }

  async function refreshWorkspace(nextMode: WorkspaceMode, preserveSelection = true) {
    setLoading(true);
    setError(null);

    try {
      if (nextMode === "account") {
        await loadAccountWorkspace();
      } else {
        await loadLocalDrafts();
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Something went wrong loading the workspace.");
    } finally {
      setLoading(false);
      if (!preserveSelection) {
        setSelectedId(null);
      }
    }
  }

  const loadInitialWorkspace = useEffectEvent(async () => {
    await claimAnonymousDrafts();
    await refreshWorkspace(sessionUser ? "account" : "local", false);
  });

  useEffect(() => {
    void loadInitialWorkspace();
  }, [sessionUserId]);

  useEffect(() => {
    const syncHistory = () => {
      setViewHistory(readPasteViewHistory());
    };

    syncHistory();
    window.addEventListener("storage", syncHistory);
    window.addEventListener(PASTE_VIEW_HISTORY_UPDATED_EVENT, syncHistory);

    return () => {
      window.removeEventListener("storage", syncHistory);
      window.removeEventListener(PASTE_VIEW_HISTORY_UPDATED_EVENT, syncHistory);
    };
  }, []);

  useEffect(() => {
    setWorkspaceMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const fork = initialForkSlug?.trim();
    const slug = fork;
    if (!slug) {
      return;
    }
    const importKey = `fork:${slug}`;
    if (loading) {
      return;
    }
    if (lastForkImportKeyRef.current === importKey || forkImportInFlightRef.current === importKey) {
      return;
    }
    forkImportInFlightRef.current = importKey;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/pastes/${encodeURIComponent(slug)}`, { cache: "no-store" });
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          const errBody = payload as { error?: string } | null;
          if (!cancelled) {
            setError(
              errBody?.error ??
                (res.status === 423
                  ? "Password required — unlock the paste in /p/… in this browser, then try Fork again."
                  : `Could not load paste (${res.status}).`)
            );
          }
          return;
        }
        const remote = payload as PublicPasteRecord;
        if (!remote || typeof remote !== "object" || !("id" in remote)) {
          if (!cancelled) {
            setError("Invalid paste response.");
          }
          return;
        }
        const src = normalizeRemotePaste(remote);
        const next = buildForkFromSource(src, mode);
        if (cancelled) {
          return;
        }
        lastForkImportKeyRef.current = importKey;
        setSnapshot((current) =>
          sanitizeSnapshot({
            folders: current.folders,
            pastes: [next, ...current.pastes]
          })
        );
        setSidebarFolder((folder) => (folder === PUBLIC_FEED_FOLDER ? "all" : folder));
        setSelectedId(next.id);
        setPublishUrl(null);
        setStatus(`Forked “${remote.title}” from the web — save to publish.`);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not import paste.");
        }
      } finally {
        forkImportInFlightRef.current = null;
        if (!cancelled) {
          router.replace("/app", { scroll: false });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialForkSlug, loading, mode, router]);

  useLayoutEffect(() => {
    try {
      setUiTheme(parseUiThemeMode(localStorage.getItem(UI_THEME_STORAGE_KEY), localStorage.getItem(LEGACY_APP_SHELL_LIGHT_KEY)));
      setAppHighContrast(localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY) === "1");

      const isMobileLayout = window.matchMedia("(max-width: 1023px)").matches;
      if (isMobileLayout) {
        skipNextWorkspacePersist.current = true;
        setLeftSidebarCollapsed(true);
        setRightSidebarCollapsed(true);
        setRibbonCollapsed(true);
      } else {
        setRibbonCollapsed(localStorage.getItem("woxbin_ribbon_collapsed") === "1");
        setLeftSidebarCollapsed(localStorage.getItem("woxbin_left_collapsed") === "1");
        setRightSidebarCollapsed(localStorage.getItem("woxbin_right_collapsed") === "1");
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mq = window.matchMedia("(max-width: 767px)");
    const syncNarrow = () => {
      setNarrowEditorViewport(mq.matches);
      setPhoneViewport(mq.matches);
    };
    syncNarrow();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", syncNarrow);
      return () => mq.removeEventListener("change", syncNarrow);
    }
    mq.addListener(syncNarrow);
    return () => mq.removeListener(syncNarrow);
  }, []);

  /** When the viewport becomes phone/tablet width, reclaim space for the editor (don’t persist — keeps desktop sidebar prefs). */
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mq = window.matchMedia("(max-width: 1023px)");
    const onLayoutNarrow = () => {
      if (!mq.matches) {
        return;
      }
      skipNextWorkspacePersist.current = true;
      setLeftSidebarCollapsed(true);
      setRightSidebarCollapsed(true);
      setRibbonCollapsed(true);
    };
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onLayoutNarrow);
      return () => mq.removeEventListener("change", onLayoutNarrow);
    }
    mq.addListener(onLayoutNarrow);
    return () => mq.removeListener(onLayoutNarrow);
  }, []);

  useEffect(() => {
    try {
      const isMobileLayout =
        typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
      const st = localStorage.getItem("woxbin_syntax_theme");
      if (st) {
        setSyntaxTheme(normalizeSyntaxTheme(st));
      }
      const tone = localStorage.getItem("woxbin_workspace_tone");
      setWorkspaceTone(normalizeWorkspaceTone(tone));
      const fs = localStorage.getItem("woxbin_editor_font");
      if (fs) {
        const n = Number(fs);
        if (Number.isFinite(n) && n >= 12 && n <= 22) {
          setEditorFontSize(n);
        }
      }
      const zoom = localStorage.getItem("woxbin_page_zoom");
      if (zoom) {
        const n = Number(zoom);
        if (Number.isFinite(n)) {
          setPageZoom(clampWorkspaceZoom(n));
        }
      }
      setEditorLineNumbers(localStorage.getItem("woxbin_editor_line_numbers") !== "0");
      setEditorWordWrap(
        isMobileLayout
          ? localStorage.getItem("woxbin_editor_word_wrap") !== "0"
          : localStorage.getItem("woxbin_editor_word_wrap") === "1"
      );
      setEditorActiveIndentGuides(localStorage.getItem("woxbin_editor_active_indent_guides") === "1");
      setPrintWrapLongLines(localStorage.getItem("woxbin_print_wrap") !== "0");
      const storedPrintLayout = localStorage.getItem("woxbin_print_layout") as PrintLayoutPreset | null;
      if (storedPrintLayout === "comfortable" || storedPrintLayout === "minimal" || storedPrintLayout === "document") {
        setPrintLayoutPreset(storedPrintLayout);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (skipNextWorkspacePersist.current) {
      skipNextWorkspacePersist.current = false;
      return;
    }
    try {
      localStorage.setItem("woxbin_ribbon_collapsed", ribbonCollapsed ? "1" : "0");
      localStorage.setItem("woxbin_left_collapsed", leftSidebarCollapsed ? "1" : "0");
      localStorage.setItem("woxbin_right_collapsed", rightSidebarCollapsed ? "1" : "0");
      localStorage.setItem("woxbin_syntax_theme", syntaxTheme);
      localStorage.setItem("woxbin_workspace_tone", workspaceTone);
      localStorage.setItem("woxbin_editor_font", String(editorFontSize));
      localStorage.setItem("woxbin_page_zoom", String(pageZoom));
      localStorage.setItem("woxbin_editor_line_numbers", editorLineNumbers ? "1" : "0");
      localStorage.setItem("woxbin_editor_word_wrap", editorWordWrap ? "1" : "0");
      localStorage.setItem("woxbin_editor_active_indent_guides", editorActiveIndentGuides ? "1" : "0");
      localStorage.setItem("woxbin_print_wrap", printWrapLongLines ? "1" : "0");
      localStorage.setItem("woxbin_print_layout", printLayoutPreset);
      localStorage.setItem(UI_THEME_STORAGE_KEY, uiTheme);
      localStorage.setItem(LEGACY_APP_SHELL_LIGHT_KEY, resolveUiTheme(uiTheme) === "light" ? "1" : "0");
      localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, appHighContrast ? "1" : "0");
      dispatchUiShellApply();
    } catch {
      /* ignore */
    }
  }, [
    ribbonCollapsed,
    leftSidebarCollapsed,
    rightSidebarCollapsed,
    syntaxTheme,
    workspaceTone,
    editorFontSize,
    pageZoom,
    editorLineNumbers,
    editorWordWrap,
    editorActiveIndentGuides,
    printWrapLongLines,
    printLayoutPreset,
    uiTheme,
    appHighContrast
  ]);

  useEffect(() => {
    document.documentElement.dataset.woxPrintWrap = printWrapLongLines ? "1" : "0";
    document.documentElement.dataset.woxPrintLayout = printLayoutPreset;
  }, [printWrapLongLines, printLayoutPreset]);

  useEffect(() => {
    if (sidebarFolder === PUBLIC_FEED_FOLDER) {
      if (!publicFeedPastes.length) {
        return;
      }
      if (!selectedId || !publicFeedPastes.some((p) => p.id === selectedId)) {
        setSelectedId(publicFeedPastes[0]!.id);
      }
      return;
    }

    if (!snapshot.pastes.length) {
      return;
    }

    if (!selectedId || !snapshot.pastes.some((paste) => paste.id === selectedId)) {
      setSelectedId(snapshot.pastes[0]!.id);
    }
  }, [selectedId, snapshot.pastes, sidebarFolder, publicFeedPastes]);

  useEffect(() => {
    if (tutorialAutoOpenHandledRef.current || loading) {
      return;
    }
    if (snapshot.pastes.length > 0 && !selectedId) {
      return;
    }

    tutorialAutoOpenHandledRef.current = true;

    if (initialTutorialRequested) {
      openTutorial(0);
      return;
    }

    if (!sessionUserId || typeof window === "undefined") {
      return;
    }

    const seen = window.localStorage.getItem(tutorialStorageKey(sessionUserId)) === "1";
    const shouldAutoOpen = snapshot.pastes.length <= 1;
    if (!seen && shouldAutoOpen) {
      openTutorial(0);
    }
  }, [initialTutorialRequested, loading, openTutorial, selectedId, sessionUserId, snapshot.pastes.length]);

  useEffect(() => {
    if (!tutorialOpen) {
      return;
    }

    const step = tutorialSteps[tutorialStepIndex];
    if (!step) {
      return;
    }

    if (phoneViewport) {
      setMobileLibraryOpen(false);
      setMobileDetailsOpen(false);
    } else {
      if (step.targetId === "library-sidebar") {
        setLeftSidebarCollapsed(false);
      }
      if (step.targetId === "details-panel") {
        setRightSidebarCollapsed(false);
      }
    }

    if (step.targetId === "templates-button") {
      setRibbonCollapsed(false);
      setRibbonTab("insert");
    }

    const timeoutId = window.setTimeout(() => {
      const target = findVisibleTutorialTarget(step.targetId);
      target?.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth"
      });
    }, 140);

    return () => window.clearTimeout(timeoutId);
  }, [phoneViewport, tutorialOpen, tutorialStepIndex, tutorialSteps]);

  useEffect(() => {
    if (sidebarFolder !== PUBLIC_FEED_FOLDER) {
      return;
    }
    let cancelled = false;
    setPublicFeedLoading(true);
    setPublicFeedError(null);
    void (async () => {
      try {
        const response = await fetch("/api/public/feed", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Could not load public feed.");
        }
        const body = (await response.json()) as { pastes: PublicPasteRecord[] };
        if (!cancelled) {
          setPublicFeedPastes(body.pastes.map(normalizeRemotePaste));
        }
      } catch (e) {
        if (!cancelled) {
          setPublicFeedError(e instanceof Error ? e.message : "Feed failed.");
          setPublicFeedPastes([]);
        }
      } finally {
        if (!cancelled) {
          setPublicFeedLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sidebarFolder]);

  useEffect(() => {
    setFolderDraftMode(false);
  }, [selectedId]);

  useEffect(() => {
    const el = editorPaneScrollRef.current;
    if (el) {
      el.scrollTop = 0;
    }
    mainEditorRef.current?.setScrollRatio(0);
    setEditorPaneCompact(false);
  }, [selectedId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        handleNewPaste();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void handleSavePaste();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFindOpen(true);
      }

      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "h") {
        event.preventDefault();
        setReplaceOpen(true);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setLeftSidebarCollapsed(false);
        setQuickOpenOpen(true);
        return;
      }

      if (event.key === "?" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (!isShortcutConsumingTarget(event.target)) {
          event.preventDefault();
          setShortcutsOpen(true);
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        const p = selectedPasteRef.current;
        if (!p) {
          return;
        }
        const pos = mainEditorRef.current?.getSelectionStart() ?? 0;
        const pair = findBracketPairAtCursor(p.content, pos);
        if (pair) {
          mainEditorRef.current?.setSelectionRange(pair.start, pair.end + 1);
          mainEditorRef.current?.focus();
          setStatus("Bracket pair selected.");
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("woxbin_sort_order") as SortOrder | null;
      if (stored && ["pinned_updated", "newest", "oldest", "title", "updated"].includes(stored)) {
        setSortOrder(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("woxbin_sort_order", sortOrder);
    } catch {
      /* ignore */
    }
  }, [sortOrder]);

  useEffect(() => {
    setFindMatchIndex(0);
  }, [findQuery]);

  useEffect(() => {
    if (!status?.trim()) {
      return;
    }
    const id = window.setTimeout(() => setStatus(null), STATUS_MESSAGE_AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [status]);

  useEffect(() => {
    if (!error?.trim()) {
      return;
    }
    const id = window.setTimeout(() => setError(null), ERROR_MESSAGE_AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [error]);

  const librarySourcePastes = useMemo(
    () => (sidebarFolder === PUBLIC_FEED_FOLDER ? publicFeedPastes : snapshot.pastes),
    [sidebarFolder, publicFeedPastes, snapshot.pastes]
  );

  const filteredPastes = useMemo(() => {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const q = deferredSearch.trim().toLowerCase();
    return librarySourcePastes.filter((paste) => {
      const matchesSearch =
        !q ||
        (() => {
          const tags = Array.isArray(paste.tags) ? paste.tags : [];
          const files = Array.isArray(paste.files) ? paste.files : [];
          const fileHaystack = files
            .map((f) =>
              isPasteFileMedia(f) ? f.filename : `${f.filename}\n${f.content}`
            )
            .join("\n");
          const haystack = [
            paste.title ?? "",
            paste.content ?? "",
            tags.join(" "),
            paste.language ?? "",
            paste.folder ?? "",
            fileHaystack
          ]
            .join("\n")
            .toLowerCase();
          return haystack.includes(q);
        })();

      const matchesFolder =
        sidebarFolder === PUBLIC_FEED_FOLDER
          ? true
          : sidebarFolder === "all"
            ? true
            : paste.folder === sidebarFolder;

      if (!matchesSearch || !matchesFolder) {
        return false;
      }
      if (listQuickFilter === "favorites" && !paste.favorite) {
        return false;
      }
      if (listQuickFilter === "archived" && !paste.archived) {
        return false;
      }
      if (listQuickFilter === "recent") {
        if (Date.now() - new Date(paste.updatedAt).getTime() > weekMs) {
          return false;
        }
      }
      return true;
    });
  }, [librarySourcePastes, sidebarFolder, deferredSearch, listQuickFilter]);

  const listAfterFilter = useMemo(() => {
    let list = filteredPastes;
    if (pinnedOnly) {
      list = list.filter((p) => p.pinned);
    }
    return applySidebarSort(list, sortOrder);
  }, [filteredPastes, pinnedOnly, sortOrder]);

  const selectedPaste = useMemo(() => {
    if (selectedId != null) {
      const fromWorkspace = snapshot.pastes.find((paste) => paste.id === selectedId);
      if (fromWorkspace) {
        return fromWorkspace;
      }
      const fromFeed = publicFeedPastes.find((paste) => paste.id === selectedId);
      if (fromFeed) {
        return fromFeed;
      }
      return null;
    }
    return listAfterFilter[0] ?? null;
  }, [listAfterFilter, publicFeedPastes, selectedId, snapshot.pastes]);

  const selectedPasteInWorkspace = useMemo(
    () => Boolean(selectedPaste && snapshot.pastes.some((p) => p.id === selectedPaste.id)),
    [selectedPaste, snapshot.pastes]
  );

  const sidebarShowsPublicFeed = sidebarFolder === PUBLIC_FEED_FOLDER;
  const mobilePasteActionTarget = useMemo(() => {
    if (!mobilePasteActions.open) {
      return null;
    }
    return (
      snapshot.pastes.find((paste) => paste.id === mobilePasteActions.pasteId) ??
      publicFeedPastes.find((paste) => paste.id === mobilePasteActions.pasteId) ??
      null
    );
  }, [mobilePasteActions, publicFeedPastes, snapshot.pastes]);

  selectedPasteRef.current = selectedPaste;

  const selectedPasteId = selectedPaste?.id;

  /** Compact ribbon from textarea scroll; also syncs Markdown preview when open. */
  const handleMainEditorScrollInfo = useCallback(
    (info: PrismScrollMetrics) => {
      const st = info.scrollTop;
      setEditorPaneCompact((prev) => {
        if (st <= EDITOR_SCROLL_COMPACT_EXIT) {
          return false;
        }
        if (st >= EDITOR_SCROLL_COMPACT_ENTER) {
          return true;
        }
        return prev;
      });
      if (!mdPreviewOpen || selectedPaste?.language !== "markdown") {
        return;
      }
      const pv = mdPreviewRef.current;
      if (!pv || mdScrollLock.current === "preview") {
        return;
      }
      mdScrollLock.current = "editor";
      const taMax = Math.max(1, info.scrollHeight - info.clientHeight);
      const ratio = taMax ? info.scrollTop / taMax : 0;
      const pvMax = Math.max(1, pv.scrollHeight - pv.clientHeight);
      pv.scrollTop = ratio * pvMax;
      requestAnimationFrame(() => {
        mdScrollLock.current = null;
      });
    },
    [mdPreviewOpen, selectedPaste?.language]
  );

  useEffect(() => {
    if (mode === "account") {
      const p = selectedPasteRef.current;
      if (p) {
        lastAutosaveFingerprintRef.current = buildPasteFingerprint(p);
      }
    }
  }, [mode, selectedPasteId]);

  const selectedPasteLineageDisplay = useMemo(() => {
    if (!selectedPaste) {
      return null;
    }
    if (mode === "local") {
      return enrichPasteLineageForLocal(selectedPaste, snapshot.pastes);
    }
    return selectedPaste;
  }, [selectedPaste, mode, snapshot.pastes]);

  const findMatches = useMemo(() => {
    if (!findQuery || !selectedPaste) {
      return [] as number[];
    }
    const lower = selectedPaste.content.toLowerCase();
    const q = findQuery.toLowerCase();
    const out: number[] = [];
    let i = 0;
    while (i <= selectedPaste.content.length) {
      const j = lower.indexOf(q, i);
      if (j < 0) {
        break;
      }
      out.push(j);
      i = j + Math.max(1, q.length);
    }
    return out;
  }, [findQuery, selectedPaste]);

  const markdownPreviewHtml = useMemo(() => {
    if (!selectedPaste || selectedPaste.language !== "markdown" || !mdPreviewOpen) {
      return "";
    }
    return parseUserMarkdown(selectedPaste.content, { breaks: true });
  }, [selectedPaste, mdPreviewOpen]);

  const diffVersionHtml = useMemo(() => {
    if (!diffVersion || !selectedPaste) {
      return "";
    }
    const dmp = new DiffMatchPatch();
    const diff = dmp.diff_main(diffVersion.content, selectedPaste.content);
    dmp.diff_cleanupSemantic(diff);
    return DOMPurify.sanitize(dmp.diff_prettyHtml(diff));
  }, [diffVersion, selectedPaste]);

  /** Prefer quota tier so admins/moderators see “Admin” limits on the badge, not only the DB plan row. */
  const displayedPlan = accountPlan?.quotaPlan ?? accountPlan?.plan ?? sessionUser?.plan ?? "free";
  const displayedPlanStatus = accountPlan?.planStatus ?? sessionUser?.planStatus ?? "active";
  const canEditCustomSlug = Boolean(accountPlan?.features.customSlugs);
  const customSlugReadOnly = mode !== "account" || !canEditCustomSlug;

  const changePageZoom = useCallback((delta: number) => {
    setPageZoom((current) => clampWorkspaceZoom(current + delta));
  }, []);

  function updateSelectedPaste(recipe: (paste: WorkspacePaste) => WorkspacePaste) {
    if (!selectedPaste || !snapshot.pastes.some((p) => p.id === selectedPaste.id)) {
      return;
    }

    setSnapshot((current) =>
      sanitizeSnapshot({
        folders: current.folders,
        pastes: current.pastes.map((paste) =>
          paste.id === selectedPaste.id
            ? recipe({
                ...paste
              })
            : paste
        )
      })
    );
  }

  function escapeRegExp(text: string) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function focusFindMatch(index: number) {
    if (!selectedPaste || !findQuery || !findMatches.length) {
      return;
    }
    const idx = ((index % findMatches.length) + findMatches.length) % findMatches.length;
    setFindMatchIndex(idx);
    const start = findMatches[idx];
    requestAnimationFrame(() => {
      mainEditorRef.current?.setSelectionRange(start, start + findQuery.length);
      mainEditorRef.current?.focus();
    });
  }

  function findInPasteNext(back = false) {
    if (!findMatches.length) {
      return;
    }
    focusFindMatch(findMatchIndex + (back ? -1 : 1));
  }

  function replaceInPasteOne() {
    if (!selectedPaste || !replaceFind) {
      return;
    }
    const start = mainEditorRef.current?.getSelectionStart() ?? 0;
    const content = selectedPaste.content;
    const end = start + replaceFind.length;
    const slice = content.slice(start, end);
    if (slice.toLowerCase() !== replaceFind.toLowerCase()) {
      findInPasteNext(false);
      return;
    }
    const newContent = content.slice(0, start) + replaceWith + content.slice(end);
    updateSelectedPaste((p) => ({
      ...p,
      content: newContent,
      updatedAt: new Date().toISOString()
    }));
    requestAnimationFrame(() => {
      mainEditorRef.current?.setSelectionRange(start, start + replaceWith.length);
      findInPasteNext(false);
    });
  }

  function replaceInPasteAll() {
    if (!selectedPaste || !replaceFind) {
      return;
    }
    const newContent = selectedPaste.content.replaceAll(new RegExp(escapeRegExp(replaceFind), "gi"), replaceWith);
    updateSelectedPaste((p) => ({
      ...p,
      content: newContent,
      updatedAt: new Date().toISOString()
    }));
    setStatus("Replaced all matches.");
  }

  async function submitImportUrl() {
    const url = importUrl.trim();
    if (!url) {
      setError("Enter a URL to import.");
      return;
    }

    function applyImportedUrlContent(text: string, title: string) {
      const safeTitle = title.slice(0, 200);
      if (!selectedPaste) {
        leavePublicFeedForNewWorkspacePaste();
        const fresh = markNewAccountDraft(
          createEmptyPaste({
            title: safeTitle,
            folder: snapshot.folders[0] || DEFAULT_FOLDERS[0] || null,
            content: text,
            language: "none"
          }) as WorkspacePaste,
          mode
        );
        setSnapshot((current) =>
          sanitizeSnapshot({
            folders: current.folders,
            pastes: [fresh, ...current.pastes]
          })
        );
        setSelectedId(fresh.id);
      } else {
        updateSelectedPaste((p) => ({
          ...p,
          content: text,
          title: safeTitle,
          updatedAt: new Date().toISOString()
        }));
      }
      setImportUrlOpen(false);
      setImportUrl("");
      setStatus("Imported content from URL.");
    }

    setImportUrlBusy(true);
    setError(null);
    try {
      if (sessionUser) {
        const res = await fetch("/api/workspace/import-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url })
        });
        const data = (await res.json()) as { text?: string; title?: string; error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "Import failed");
        }
        const text = data.text ?? "";
        const title = data.title ?? "Imported";
        applyImportedUrlContent(text, title);
        return;
      }

      const fetchUrl = normalizeRawPasteFetchUrl(url);
      let derivedTitle = "Imported";
      try {
        const parsed = new URL(fetchUrl);
        derivedTitle =
          parsed.pathname.split("/").filter(Boolean).pop()?.replace(/\.txt$/i, "") ||
          parsed.hostname ||
          derivedTitle;
      } catch {
        /* ignore */
      }

      const res = await fetch(fetchUrl, { mode: "cors", credentials: "omit", redirect: "follow" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const text = await res.text();
      applyImportedUrlContent(text, derivedTitle);
    } catch (e) {
      setError(
        e instanceof Error
          ? sessionUser
            ? e.message
            : `${e.message} Sign in for server-side import if this site blocks browser fetches (CORS), or paste manually.`
          : "Import failed."
      );
    } finally {
      setImportUrlBusy(false);
    }
  }

  function applyBuiltinTemplate(t: (typeof BUILTIN_TEMPLATES)[number]) {
    const templateFiles = t.files?.map((file) => ({ ...file })) ?? [];
    if (!selectedPaste) {
      const fresh = markNewAccountDraft(
        createEmptyPaste({
          title: `${t.title} (from template)`,
          folder: t.folder ?? snapshot.folders[0] ?? DEFAULT_FOLDERS[0] ?? null,
          content: t.content,
          language: t.language,
          category: t.category ?? null,
          tags: t.tags ?? [],
          files: templateFiles
        }) as WorkspacePaste,
        mode
      );
      setSnapshot((current) =>
        sanitizeSnapshot({
          folders: current.folders,
          pastes: [fresh, ...current.pastes]
        })
      );
      setSelectedId(fresh.id);
    } else {
      updateSelectedPaste((p) => ({
        ...p,
        content: t.content,
        language: t.language,
        title: `${t.title} (from template)`,
        category: t.category ?? null,
        tags: t.tags ?? [],
        files: templateFiles,
        updatedAt: new Date().toISOString()
      }));
    }
    setTemplatesOpen(false);
    setStatus(`Applied template: ${t.title}`);
  }

  function applyUserTemplate(src: WorkspacePaste) {
    if (!selectedPaste) {
      const fresh = markNewAccountDraft(
        createEmptyPaste({
          title: `${src.title || "Untitled"} (from template)`,
          folder: snapshot.folders[0] || DEFAULT_FOLDERS[0] || null,
          content: src.content,
          language: src.language,
          files: src.files.map((f) => ({ ...f }))
        }) as WorkspacePaste,
        mode
      );
      setSnapshot((current) =>
        sanitizeSnapshot({
          folders: current.folders,
          pastes: [fresh, ...current.pastes]
        })
      );
      setSelectedId(fresh.id);
    } else {
      updateSelectedPaste((p) => ({
        ...p,
        content: src.content,
        language: src.language,
        title: `${src.title || "Untitled"} (from template)`,
        files: src.files.map((f) => ({ ...f })),
        updatedAt: new Date().toISOString()
      }));
    }
    setTemplatesOpen(false);
    setStatus(`Applied template from "${src.title}".`);
  }

  function restorePasteVersion(version: PasteVersionDraft) {
    updateSelectedPaste((p) => ({
      ...p,
      title: version.title,
      content: version.content,
      files: version.files.map((f) => ({ ...f })),
      updatedAt: new Date().toISOString()
    }));
    setStatus("Restored a previous version into the editor (save to persist).");
  }

  function leavePublicFeedForNewWorkspacePaste() {
    if (sidebarFolder === PUBLIC_FEED_FOLDER) {
      setSidebarFolder("all");
    }
  }

  function handleNewPaste() {
    leavePublicFeedForNewWorkspacePaste();
    const fresh = markNewAccountDraft(
      createEmptyPaste({
        title: mode === "account" ? "Untitled cloud paste" : "Untitled local draft",
        folder: snapshot.folders[0] || DEFAULT_FOLDERS[0] || null
      }) as WorkspacePaste,
      mode
    );

    setSnapshot((current) =>
      sanitizeSnapshot({
        folders: current.folders,
        pastes: [fresh, ...current.pastes]
      })
    );
    setSelectedId(fresh.id);
    setStatus("Started a new paste.");
    setPublishUrl(null);
  }

  function handleDuplicatePaste() {
    if (!selectedPaste) {
      return;
    }

    const duplicate = buildForkFromSource(selectedPaste, mode);

    setSnapshot((current) =>
      sanitizeSnapshot({
        folders: current.folders,
        pastes: [duplicate, ...current.pastes]
      })
    );
    leavePublicFeedForNewWorkspacePaste();
    setSelectedId(duplicate.id);
    setStatus("Created a fork of this paste (same content). Save to persist lineage.");
  }

  async function handleDeleteFolder(folderName: string) {
    if (!confirm(`Delete folder "${folderName}"? Pastes in this folder will move to no folder.`)) {
      return;
    }

    setError(null);
    try {
      if (mode === "account") {
        if (!sessionUser) {
          return;
        }
        const res = await fetch("/api/workspace/folders", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: folderName })
        });
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(data?.error ?? "Could not delete folder.");
        }
        await refreshWorkspace("account");
      } else {
        await deleteLocalFolder(folderName);
        await refreshWorkspace("local");
      }

      if (sidebarFolder === folderName) {
        setSidebarFolder("all");
      }
      setStatus(`Removed folder "${folderName}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Folder delete failed.");
    }
  }

  function openNewFolderModal() {
    setFolderModalName("");
    setFolderModal({ open: true, mode: "new" });
  }

  function openRenameFolderModal(from: string) {
    setFolderModalName(from);
    setFolderModal({ open: true, mode: "rename", from });
  }

  async function submitCreateFolder(nameRaw: string) {
    const name = nameRaw.trim();
    if (!name) {
      setError("Enter a folder name.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (mode === "account") {
        if (!sessionUser) {
          return;
        }
        const res = await fetch("/api/workspace/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name })
        });
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(data?.error ?? "Could not create folder.");
        }
        await refreshWorkspace("account");
      } else {
        await addLocalFolder(name);
        await refreshWorkspace("local");
      }
      setFolderModal({ open: false });
      setSidebarFolder(name);
      setStatus(`Created folder "${name}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create folder.");
    } finally {
      setSaving(false);
    }
  }

  async function submitRenameFolder(from: string, toRaw: string) {
    const to = toRaw.trim();
    if (!to) {
      setError("Enter a folder name.");
      return;
    }
    if (from === to) {
      setFolderModal({ open: false });
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (mode === "account") {
        if (!sessionUser) {
          return;
        }
        const res = await fetch("/api/workspace/folders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from, to })
        });
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(data?.error ?? "Could not rename folder.");
        }
        await refreshWorkspace("account");
      } else {
        await renameLocalFolder(from, to);
        await refreshWorkspace("local");
      }
      if (sidebarFolder === from) {
        setSidebarFolder(to);
      }
      setFolderModal({ open: false });
      setStatus(`Renamed folder to "${to}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rename folder.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePaste(opts?: { silent?: boolean }) {
    if (!selectedPaste || !snapshot.pastes.some((p) => p.id === selectedPaste.id)) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (mode === "account") {
        const response = await fetch("/api/workspace/pastes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(buildPastePayload(selectedPaste))
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Could not save the paste.");
        }

        const body = (await response.json()) as SavePasteResponse;
        const saved = normalizeRemotePaste(body.paste);
        setAccountPlan(body.plan);
        setSnapshot((current) =>
          sanitizeSnapshot({
            folders: current.folders,
            pastes: [saved, ...current.pastes.filter((paste) => paste.id !== selectedPaste.id)]
          })
        );
        setSelectedId(saved.id);
        if (!opts?.silent) {
          setStatus(`Saved "${saved.title}" to your account.`);
        }
        lastAutosaveFingerprintRef.current = buildPasteFingerprint(saved);
      } else {
        await saveLocalPaste({
          ...selectedPaste,
          updatedAt: new Date().toISOString()
        });
        const local = await loadLocalWorkspace();
        setSnapshot(
          sanitizeSnapshot({
            folders: local.snapshot.folders,
            pastes: local.snapshot.pastes
          })
        );
        setSelectedId(selectedPaste.id);
        if (!opts?.silent) {
          setStatus(`Saved "${selectedPaste.title}" locally.`);
        }
      }
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "Save failed.";
      setError(msg);
      if (opts?.silent) {
        throw nextError;
      }
    } finally {
      setSaving(false);
    }
  }

  const maybeAutosave = useEffectEvent(async () => {
    setAutosaveHint("pending");
    try {
      await handleSavePaste({ silent: true });
      setAutosaveHint("saved");
      window.setTimeout(() => setAutosaveHint("idle"), 2000);
    } catch {
      setAutosaveHint("idle");
    }
  });

  // Omit `maybeAutosave` from deps: it is from useEffectEvent and must not be listed (React / eslint rule).
  useEffect(() => {
    if (mode !== "account" || !selectedPaste || saving || !selectedPasteInWorkspace) {
      return;
    }
    const fp = buildPasteFingerprint(selectedPaste);
    if (fp === lastAutosaveFingerprintRef.current) {
      return;
    }
    const timer = window.setTimeout(() => {
      void maybeAutosave();
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [mode, selectedPaste, saving, selectedPasteInWorkspace]);

  async function handleDeletePaste() {
    if (!selectedPaste) {
      return;
    }
    if (!snapshot.pastes.some((p) => p.id === selectedPaste.id)) {
      setError("Public feed pastes are read-only here. Open your library to edit or delete your own pastes.");
      return;
    }

    const unsavedAccount = isAccountOnlyDraft(selectedPaste, mode);
    const confirmMessage = unsavedAccount
      ? `Discard "${selectedPaste.title}"? This draft is not saved to your account yet.`
      : `Delete "${selectedPaste.title}"? This cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setError(null);

    if (mode === "account") {
      if (!unsavedAccount) {
        const response = await fetch(`/api/workspace/pastes/${selectedPaste.slug}`, {
          method: "DELETE"
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          setError(body?.error ?? "Could not delete that paste.");
          return;
        }

        const body = (await response.json()) as MutationPlanResponse;
        setAccountPlan(body.plan);
      }
    } else {
      await deleteLocalPaste(selectedPaste.id);
    }

    setSnapshot((current) => ({
      folders: current.folders,
      pastes: current.pastes.filter((paste) => paste.id !== selectedPaste.id)
    }));
    setSelectedId(null);
    setStatus(unsavedAccount ? `Discarded "${selectedPaste.title}".` : `Deleted "${selectedPaste.title}".`);
    setPublishUrl(null);
  }

  function duplicatePasteById(pasteId: string) {
    const src = snapshot.pastes.find((p) => p.id === pasteId) ?? publicFeedPastes.find((p) => p.id === pasteId);
    if (!src) {
      return;
    }

    const duplicate = buildForkFromSource(src, mode);

    setSnapshot((current) =>
      sanitizeSnapshot({
        folders: current.folders,
        pastes: [duplicate, ...current.pastes]
      })
    );
    leavePublicFeedForNewWorkspacePaste();
    setSelectedId(duplicate.id);
    setStatus(`Forked "${src.title}".`);
  }

  async function deletePasteById(pasteId: string) {
    const paste = snapshot.pastes.find((p) => p.id === pasteId);
    if (!paste) {
      if (publicFeedPastes.some((p) => p.id === pasteId)) {
        setError("Public feed pastes are read-only here. Fork to add a copy to your library.");
      }
      return;
    }

    const unsavedAccount = isAccountOnlyDraft(paste, mode);
    const confirmMessage = unsavedAccount
      ? `Discard "${paste.title}"? This draft is not saved to your account yet.`
      : `Delete "${paste.title}"? This cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setError(null);

    try {
      if (mode === "account") {
        if (!unsavedAccount) {
          const response = await fetch(`/api/workspace/pastes/${paste.slug}`, {
            method: "DELETE"
          });

          if (!response.ok) {
            const body = (await response.json().catch(() => null)) as { error?: string } | null;
            setError(body?.error ?? "Could not delete that paste.");
            return;
          }

          const body = (await response.json()) as MutationPlanResponse;
          setAccountPlan(body.plan);
        }
      } else {
        await deleteLocalPaste(pasteId);
      }

      setSnapshot((current) => ({
        folders: current.folders,
        pastes: current.pastes.filter((p) => p.id !== pasteId)
      }));
      setBatchSelected((prev) => {
        const next = new Set(prev);
        next.delete(pasteId);
        return next;
      });
      if (selectedId === pasteId) {
        setSelectedId(null);
      }
      setStatus(unsavedAccount ? `Discarded "${paste.title}".` : `Deleted "${paste.title}".`);
      setPublishUrl(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  async function movePasteToFolder(pasteId: string, folderName: string) {
    const name = folderName.trim();
    const paste = snapshot.pastes.find((p) => p.id === pasteId);
    if (!paste || !name) {
      if (!paste && publicFeedPastes.some((p) => p.id === pasteId)) {
        setError("Public feed pastes are read-only here. Fork a copy to organize it in your library.");
      }
      return;
    }

    const updated = { ...paste, folder: name, updatedAt: new Date().toISOString() };
    setError(null);
    setSaving(true);
    try {
      if (mode === "account") {
        const response = await fetch("/api/workspace/pastes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPastePayload(updated))
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Could not move ${paste.title}.`);
        }
        const body = (await response.json()) as SavePasteResponse;
        setAccountPlan(body.plan);
        await refreshWorkspace("account");
      } else {
        await saveLocalPaste(updated as WorkspacePaste);
        const local = await loadLocalWorkspace();
        setSnapshot(
          sanitizeSnapshot({
            folders: local.snapshot.folders,
            pastes: local.snapshot.pastes
          })
        );
      }
      setStatus(`Moved "${paste.title}" to folder "${name}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Move failed.");
    } finally {
      setSaving(false);
    }
  }

  function toggleBatchId(id: string) {
    setBatchSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAllVisibleBatch() {
    setBatchSelected(new Set(listAfterFilter.map((p) => p.id)));
  }

  function clearBatchSelection() {
    setBatchSelected(new Set());
  }

  useEffect(() => {
    if (sidebarFolder === PUBLIC_FEED_FOLDER) {
      setBatchSelected(new Set());
    }
  }, [sidebarFolder]);

  async function handleBatchDelete() {
    if (batchSelected.size === 0) {
      return;
    }
    const ids = [...batchSelected].filter((id) => snapshot.pastes.some((p) => p.id === id));
    if (ids.length === 0) {
      setError("None of the selected items are in your library. Public feed entries can’t be batch-deleted here.");
      clearBatchSelection();
      return;
    }
    const selectedPastes = ids
      .map((id) => snapshot.pastes.find((p) => p.id === id))
      .filter((p): p is WorkspacePaste => Boolean(p));
    const discardCount = selectedPastes.filter((p) => isAccountOnlyDraft(p, mode)).length;
    const confirmMessage =
      mode === "account" && discardCount > 0 && discardCount < selectedPastes.length
        ? `Remove ${ids.length} item(s)? ${discardCount} unsaved draft(s) will be discarded; saved pastes will be deleted from your account.`
        : mode === "account" && discardCount === selectedPastes.length
          ? `Discard ${discardCount} unsaved draft(s)? Nothing will be removed from the server.`
          : `Delete ${ids.length} paste(s)? This cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (mode === "account") {
        const discardIds = new Set(
          selectedPastes.filter((p) => isAccountOnlyDraft(p, mode)).map((p) => p.id)
        );
        flushSync(() => {
          setSnapshot((current) =>
            sanitizeSnapshot({
              folders: current.folders,
              pastes: current.pastes.filter((p) => !discardIds.has(p.id))
            })
          );
        });

        const serverDeletes = selectedPastes.filter((p) => !discardIds.has(p.id));
        for (const paste of serverDeletes) {
          const response = await fetch(`/api/workspace/pastes/${paste.slug}`, { method: "DELETE" });
          if (!response.ok) {
            const body = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(body?.error ?? `Could not delete ${paste.title}.`);
          }
          const body = (await response.json()) as MutationPlanResponse;
          setAccountPlan(body.plan);
        }
        if (serverDeletes.length > 0) {
          await refreshWorkspace("account");
        }
      } else {
        for (const id of ids) {
          await deleteLocalPaste(id);
        }
        const local = await loadLocalWorkspace();
        setSnapshot(
          sanitizeSnapshot({
            folders: local.snapshot.folders,
            pastes: local.snapshot.pastes
          })
        );
      }

      if (selectedId && batchSelected.has(selectedId)) {
        setSelectedId(null);
      }
      clearBatchSelection();
      setStatus(
        mode === "account" && discardCount > 0
          ? `Removed ${ids.length} item(s) from the library.`
          : `Deleted ${ids.length} paste(s).`
      );
      setPublishUrl(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Batch delete failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleBatchMove() {
    const name = batchMoveFolder.trim();
    if (batchSelected.size === 0 || !name) {
      return;
    }
    const ids = [...batchSelected].filter((id) => snapshot.pastes.some((p) => p.id === id));
    if (ids.length === 0) {
      setError("None of the selected items are in your library. Public feed entries can’t be batch-moved here.");
      clearBatchSelection();
      setBatchMoveOpen(false);
      setBatchMoveFolder("");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      for (const id of ids) {
        const paste = snapshot.pastes.find((p) => p.id === id);
        if (!paste) {
          continue;
        }
        const updated = { ...paste, folder: name, updatedAt: new Date().toISOString() };
        if (mode === "account") {
          const response = await fetch("/api/workspace/pastes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildPastePayload(updated))
          });
          if (!response.ok) {
            const body = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(body?.error ?? `Could not move ${paste.title}.`);
          }
          const body = (await response.json()) as SavePasteResponse;
          setAccountPlan(body.plan);
        } else {
          await saveLocalPaste(updated as WorkspacePaste);
        }
      }

      if (mode === "account") {
        await refreshWorkspace("account");
      } else {
        const local = await loadLocalWorkspace();
        setSnapshot(
          sanitizeSnapshot({
            folders: local.snapshot.folders,
            pastes: local.snapshot.pastes
          })
        );
      }

      setBatchMoveOpen(false);
      setBatchMoveFolder("");
      clearBatchSelection();
      setStatus(`Moved ${ids.length} paste(s) to folder "${name}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Batch move failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExportWorkspace() {
    const content =
      mode === "local"
        ? await exportLocalWorkspaceJson()
        : JSON.stringify(
            {
              version: 2,
              exportedAt: new Date().toISOString(),
              folders: snapshot.folders,
              pastes: snapshot.pastes.map((paste) => buildPastePayload(paste))
            },
            null,
            2
          );

    createDownload(`woxbin-${mode}-export.json`, content);
    setStatus(`Exported your ${mode} workspace.`);
  }

  async function importWorkspaceFromFile(file: File) {
    const text = await file.text();
    setError(null);

    let parsedJson: unknown = null;
    try {
      parsedJson = JSON.parse(text) as unknown;
    } catch {
      parsedJson = null;
    }

    if (parsedJson && isWorkspaceExportJson(parsedJson)) {
      try {
        const imported = parseLocalWorkspaceJson(text);

        if (mode === "account" && sessionUser) {
          const drafts = buildAccountImportDrafts(imported);
          setSnapshot((current) =>
            sanitizeSnapshot({
              folders: [...current.folders, ...imported.folders],
              pastes: [...drafts, ...current.pastes]
            })
          );
          setSelectedId(drafts[0]?.id ?? null);
          leavePublicFeedForNewWorkspacePaste();
          setStatus(
            `Imported ${drafts.length} paste(s) as account drafts. Review them, then save each one to your hosted workspace.`
          );
        } else {
          const localImported = await importLocalWorkspaceJson(text);
          setMode("local");
          setSnapshot({
            folders: localImported.folders,
            pastes: localImported.pastes as WorkspacePaste[]
          });
          setSelectedId(localImported.pastes[0]?.id ?? null);
          leavePublicFeedForNewWorkspacePaste();
          setStatus(`Imported ${localImported.pastes.length} paste(s) from workspace export.`);
        }
      } catch {
        setError("That workspace export could not be imported. Check that it is a valid Wox-Bin JSON backup.");
      }
      return;
    }

    try {
      const language = languageFromFilename(file.name);
      const paste = markNewAccountDraft(
        createEmptyPaste({
          title: titleFromImportedFilename(file.name),
          content: text,
          language,
          folder: snapshot.folders[0] || DEFAULT_FOLDERS[0] || null
        }) as WorkspacePaste,
        mode
      );

      leavePublicFeedForNewWorkspacePaste();
      setSnapshot((current) =>
        sanitizeSnapshot({
          folders: current.folders,
          pastes: [paste, ...current.pastes]
        })
      );
      setSelectedId(paste.id);
      setStatus(`Imported "${paste.title}" from ${file.name}.`);

      if (mode === "local") {
        await saveLocalPaste(paste);
      }
    } catch {
      setError("Could not import that file.");
    }
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    await importWorkspaceFromFile(file);
  }

  function attachMediaFromFile(picked: File, replaceIndex: number | null) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseDataUrl(dataUrl);
      if (!parsed || !isAllowedPasteMediaMime(parsed.mimeType)) {
        setError("Use a supported image (PNG, JPEG, GIF, WebP, …) or video (MP4, WebM, QuickTime, Ogg).");
        return;
      }
      const kind = mediaKindFromMime(parsed.mimeType);
      if (!kind) {
        setError("Could not determine media type.");
        return;
      }
      const filename = picked.name.trim() || (kind === "image" ? "image" : "video");

      updateSelectedPaste((paste) => {
        if (replaceIndex != null && replaceIndex >= 0 && replaceIndex < paste.files.length) {
          return {
            ...paste,
            files: paste.files.map((entry, entryIndex) =>
              entryIndex === replaceIndex
                ? {
                    ...entry,
                    filename,
                    content: parsed.base64,
                    language: "none",
                    mediaKind: kind,
                    mimeType: parsed.mimeType
                  }
                : entry
            ),
            updatedAt: new Date().toISOString()
          };
        }
        return {
          ...paste,
          files: [
            ...paste.files,
            {
              filename,
              content: parsed.base64,
              language: "none",
              mediaKind: kind,
              mimeType: parsed.mimeType
            }
          ],
          updatedAt: new Date().toISOString()
        };
      });
      setError(null);
      setStatus(`Attached ${kind} “${filename}”.`);
    };
    reader.onerror = () => {
      setError("Could not read that media file.");
    };
    reader.readAsDataURL(picked);
  }

  function handlePasteAttachmentMediaPick(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    const replaceIndex = pasteMediaAttachIndex;
    setPasteMediaAttachIndex(null);

    if (!picked) {
      return;
    }

    attachMediaFromFile(picked, replaceIndex);
  }

  async function handleMergeLocalIntoAccount() {
    if (!sessionUser) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const local = await loadLocalWorkspace();
      const drafts = local.snapshot.pastes.filter((paste) => !paste.id.startsWith("example-"));

      for (const draft of drafts) {
        const response = await fetch("/api/workspace/pastes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(buildPastePayload(draft as WorkspacePaste))
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Could not import "${draft.title}".`);
        }
      }

      await markLocalMergeComplete();
      setLocalImportCount(0);
      setMode("account");
      await refreshWorkspace("account");
      setStatus(`Imported ${drafts.length} local draft${drafts.length === 1 ? "" : "s"} into your account.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Import failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAnonymousPublish() {
    if (!selectedPaste) {
      return;
    }

    setPublishing(true);
    setError(null);
    try {
      const response = await fetch("/api/public/pastes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...buildPastePayload(selectedPaste),
          visibility: selectedPaste.visibility === "private" ? "unlisted" : selectedPaste.visibility,
          turnstileToken: readTurnstileToken()
        })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Anonymous publish failed.");
        return;
      }

      const body = (await response.json()) as {
        paste: PublicPasteRecord;
        claimToken: string;
      };

      await storeAnonymousClaim(body.paste.slug, body.claimToken);
      const url = getPasteShareUrl(window.location.origin, body.paste.slug, body.paste.secretMode);
      setPublishUrl(url);
      setStatus("Published anonymously. Save the share link or sign in later to claim it.");
    } finally {
      resetTurnstileFields();
      setPublishing(false);
    }
  }

  async function handleCreateApiKey() {
    const response = await fetch("/api/workspace/keys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        label: apiKeyLabel
      })
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not create API key.");
      return;
    }

    const body = (await response.json()) as ApiKeyCreateResponse;
    const key = body.key;
    rememberApiKeyToken(sessionUserId, key.id, key.token);
    setAccountPlan(body.plan);
    setApiKeys((current) => [
      {
        id: key.id,
        label: key.label,
        createdAt: key.createdAt,
        lastUsedAt: null,
        token: key.token
      },
      ...current
    ]);
    setRevealedApiKeyIds((current) => new Set(current).add(key.id));
    setApiKeyLabel("CLI Upload");
    setStatus("Created a new API key. This browser can now reveal and copy it again from the key card.");
  }

  async function handleRevokeApiKey(id: string) {
    const response = await fetch(`/api/workspace/keys/${id}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      setError("Could not revoke the API key.");
      return;
    }

    const body = (await response.json()) as MutationPlanResponse;
    setAccountPlan(body.plan);
    forgetRememberedApiKeyToken(sessionUserId, id);
    setRevealedApiKeyIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setApiKeys((current) => current.filter((entry) => entry.id !== id));
    setStatus("Revoked the selected API key.");
  }

  function toggleApiKeyReveal(id: string) {
    setRevealedApiKeyIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleCopyApiKeyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      setStatus("Copied the API key token.");
    } catch {
      setError("Could not copy the API key token.");
    }
  }

  async function copyPublicLink() {
    if (!selectedPaste || isAccountOnlyDraft(selectedPaste, mode)) {
      return;
    }

    const url = getPasteShareUrl(window.location.origin, selectedPaste.slug, selectedPaste.secretMode);
    await navigator.clipboard.writeText(url);
    setStatus("Copied the share link.");
  }

  async function switchMode(nextMode: WorkspaceMode) {
    setMode(nextMode);
    setPublishUrl(null);
    await refreshWorkspace(nextMode, false);
  }

  function ensureFolderListed(name: string | null) {
    const t = (name ?? "").trim();
    if (!t) {
      return;
    }
    setSnapshot((s) => {
      if (s.folders.includes(t)) {
        return s;
      }
      return sanitizeSnapshot({
        folders: [...s.folders, t],
        pastes: s.pastes
      });
    });
  }

  function handleEditorCopyAll() {
    const paste = selectedPasteRef.current;
    if (!paste) {
      return;
    }
    void navigator.clipboard.writeText(paste.content);
    setStatus("Copied entire paste to clipboard.");
  }

  function handleEditorSelectAll() {
    const el = mainEditorRef.current;
    if (!el) {
      return;
    }
    const v = el.getValue();
    el.setSelectionRange(0, v.length);
    el.focus();
  }

  function editorCopySelection() {
    const ed = mainEditorRef.current;
    if (!ed) {
      return;
    }
    const start = Math.min(ed.getSelectionStart(), ed.getSelectionEnd());
    const end = Math.max(ed.getSelectionStart(), ed.getSelectionEnd());
    const slice = ed.getValue().slice(start, end);
    if (!slice) {
      return;
    }
    void navigator.clipboard.writeText(slice);
    setStatus("Copied selection.");
  }

  function editorCutSelection() {
    const ed = mainEditorRef.current;
    if (!ed || !selectedPaste) {
      return;
    }
    const start = Math.min(ed.getSelectionStart(), ed.getSelectionEnd());
    const end = Math.max(ed.getSelectionStart(), ed.getSelectionEnd());
    const value = ed.getValue();
    const slice = value.slice(start, end);
    void navigator.clipboard.writeText(slice);
    const next = value.slice(0, start) + value.slice(end);
    updateSelectedPaste((p) => ({
      ...p,
      content: next,
      updatedAt: new Date().toISOString()
    }));
    requestAnimationFrame(() => {
      mainEditorRef.current?.setSelectionRange(start, start);
      mainEditorRef.current?.focus();
    });
  }

  function editorPasteFromClipboard() {
    const ed = mainEditorRef.current;
    if (!ed || !selectedPaste) {
      return;
    }
    void navigator.clipboard.readText().then((clip) => {
      const ta = mainEditorRef.current;
      if (!ta) {
        return;
      }
      const start = Math.min(ta.getSelectionStart(), ta.getSelectionEnd());
      const end = Math.max(ta.getSelectionStart(), ta.getSelectionEnd());
      const value = ta.getValue();
      const next = value.slice(0, start) + clip + value.slice(end);
      updateSelectedPaste((p) => ({
        ...p,
        content: next,
        updatedAt: new Date().toISOString()
      }));
      const caret = start + clip.length;
      requestAnimationFrame(() => {
        mainEditorRef.current?.setSelectionRange(caret, caret);
        mainEditorRef.current?.focus();
      });
    });
  }

  function editorClearDocument() {
    if (!selectedPaste) {
      return;
    }
    if (!confirm("Clear the entire document? This cannot be undone.")) {
      return;
    }
    updateSelectedPaste((p) => ({
      ...p,
      content: "",
      updatedAt: new Date().toISOString()
    }));
    requestAnimationFrame(() => {
      mainEditorRef.current?.setSelectionRange(0, 0);
      mainEditorRef.current?.focus();
    });
  }

  function toggleMdPreviewRibbon() {
    const paste = selectedPasteRef.current;
    if (!paste) {
      return;
    }
    if (paste.language !== "markdown") {
      updateSelectedPaste((p) => ({
        ...p,
        language: "markdown",
        updatedAt: new Date().toISOString()
      }));
      setMdPreviewOpen(true);
      return;
    }
    setMdPreviewOpen((open) => !open);
  }

  function handleFormatJsonInEditor() {
    const p = selectedPasteRef.current;
    if (!p) {
      return;
    }
    try {
      const parsed = JSON.parse(p.content) as unknown;
      const pretty = `${JSON.stringify(parsed, null, 2)}\n`;
      updateSelectedPaste((paste) => ({
        ...paste,
        content: pretty,
        language: paste.language === "none" || !paste.language ? "json" : paste.language,
        updatedAt: new Date().toISOString()
      }));
      setError(null);
      setStatus("Formatted JSON in the editor.");
    } catch {
      setError("Content is not valid JSON.");
    }
  }

  function handleMinifyJsonInEditor() {
    const p = selectedPasteRef.current;
    if (!p) {
      return;
    }
    try {
      const parsed = JSON.parse(p.content) as unknown;
      const mini = JSON.stringify(parsed);
      updateSelectedPaste((paste) => ({
        ...paste,
        content: mini,
        language: paste.language === "none" || !paste.language ? "json" : paste.language,
        updatedAt: new Date().toISOString()
      }));
      setError(null);
      setStatus("Minified JSON in the editor.");
      requestAnimationFrame(() => {
        const len = mini.length;
        mainEditorRef.current?.setSelectionRange(len, len);
        mainEditorRef.current?.focus();
      });
    } catch {
      setError("Content is not valid JSON.");
    }
  }

  function editorApplyRangeEdit(fn: (value: string, start: number, end: number) => RangeEdit) {
    const ed = mainEditorRef.current;
    if (!ed || !selectedPaste) {
      return;
    }
    const value = ed.getValue();
    const start = ed.getSelectionStart();
    const end = ed.getSelectionEnd();
    const edit = fn(value, start, end);
    updateSelectedPaste((paste) => ({
      ...paste,
      content: edit.value,
      updatedAt: new Date().toISOString()
    }));
    requestAnimationFrame(() => {
      mainEditorRef.current?.setSelectionRange(edit.selStart, edit.selEnd);
      mainEditorRef.current?.focus();
    });
  }

  function handlePrintWorkspace() {
    window.print();
  }

  function editorSelectBracketPair() {
    const p = selectedPasteRef.current;
    if (!p) {
      return;
    }
    const pos = mainEditorRef.current?.getSelectionStart() ?? 0;
    const pair = findBracketPairAtCursor(p.content, pos);
    if (pair) {
      mainEditorRef.current?.setSelectionRange(pair.start, pair.end + 1);
      mainEditorRef.current?.focus();
      setStatus("Bracket pair selected.");
    } else {
      setStatus("No matching bracket at cursor.");
    }
  }

  async function removeTemplateFromPaste(paste: WorkspacePaste) {
    const next = { ...paste, template: false, updatedAt: new Date().toISOString() };
    setSaving(true);
    setError(null);
    try {
      if (mode === "account") {
        const response = await fetch("/api/workspace/pastes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPastePayload(next))
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Could not update template flag.");
        }
        const body = (await response.json()) as SavePasteResponse;
        setAccountPlan(body.plan);
        const saved = normalizeRemotePaste(body.paste);
        setSnapshot((current) =>
          sanitizeSnapshot({
            folders: current.folders,
            pastes: [saved, ...current.pastes.filter((p) => p.id !== saved.id)]
          })
        );
      } else {
        await saveLocalPaste(next);
        const local = await loadLocalWorkspace();
        setSnapshot(
          sanitizeSnapshot({
            folders: local.snapshot.folders,
            pastes: local.snapshot.pastes
          })
        );
      }
      setStatus(`Removed "${paste.title}" from templates.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove from templates.");
    } finally {
      setSaving(false);
    }
  }

  function renderSidebar() {
    return (
      <FileDropSurface
        activeClassName="rounded-xl ring-2 ring-primary/25"
        className="h-full min-h-0 min-w-0"
        disabled={sidebarShowsPublicFeed}
        onFiles={(files) => {
          const f = files[0];
          if (f) {
            void importWorkspaceFromFile(f);
          }
        }}
        overlayClassName="rounded-xl"
        overlayMessage="Drop to import JSON backup or text/code file"
      >
        <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl" data-tutorial="library-sidebar">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="border-b border-border px-3 py-2 sm:px-5 sm:py-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Library</p>
                <h2 className="mt-0.5 text-base font-semibold leading-tight tracking-tight sm:text-lg">Pastes</h2>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  aria-label="Hide library sidebar"
                  className={cn("h-8 w-8 shrink-0", phoneViewport && "hidden")}
                  onClick={() => setLeftSidebarCollapsed(true)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
                <Button className="h-8 gap-1.5 px-2.5 text-xs sm:text-sm" onClick={handleNewPaste} size="sm" type="button">
                  <FilePlus2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  New
                </Button>
              </div>
            </div>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 pl-9 text-sm"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, content, or tags"
                ref={searchInputRef}
                value={search}
              />
            </div>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Folders</p>
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div
                  aria-label="Folders — right-click empty area for new folder"
                  className="mt-1.5 flex min-h-[2.75rem] flex-nowrap gap-2 overflow-x-auto overflow-y-visible rounded-xl border border-transparent p-1.5 -m-1.5 pb-2 transition-colors [-webkit-overflow-scrolling:touch] hover:border-border/35 data-[state=open]:border-border/50 data-[state=open]:bg-muted/25 sm:flex-wrap sm:overflow-x-visible sm:pb-1.5"
                >
              <div className="flex shrink-0 items-center gap-1">
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <Button
                      className="h-9 shrink-0 touch-manipulation text-xs sm:h-8"
                      onClick={() => setSidebarFolder("all")}
                      size="sm"
                      type="button"
                      variant={sidebarFolder === "all" ? "default" : "outline"}
                    >
                      All
                    </Button>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-52">
                    <ContextMenuLabel>All pastes</ContextMenuLabel>
                    <ContextMenuItem onSelect={() => setSidebarFolder("all")}>
                      <FolderInput className="mr-2 h-4 w-4" />
                      Show all pastes
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={openNewFolderModal}>
                      <FolderPlus className="mr-2 h-4 w-4" />
                      New folder…
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
                {phoneViewport ? (
                  <Button
                    aria-label="All paste actions"
                    className="h-9 w-9 shrink-0 touch-manipulation rounded-full p-0"
                    onClick={() => setMobileFolderActions({ open: true, kind: "all" })}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              <Button
                className="h-9 shrink-0 touch-manipulation text-xs sm:h-8"
                onClick={() => {
                  setSidebarFolder(PUBLIC_FEED_FOLDER);
                  setListQuickFilter("all");
                }}
                size="sm"
                type="button"
                variant={sidebarFolder === PUBLIC_FEED_FOLDER ? "default" : "outline"}
              >
                Public feed
              </Button>
              {snapshot.folders.map((folder) => (
                <div className="flex shrink-0 items-center gap-1" key={folder}>
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <Button
                        className="h-9 max-w-[10rem] shrink-0 touch-manipulation truncate text-xs sm:h-8 sm:max-w-[9.5rem]"
                        onClick={() => setSidebarFolder(folder)}
                        size="sm"
                        title={folder}
                        type="button"
                        variant={sidebarFolder === folder ? "default" : "outline"}
                      >
                        {folder}
                      </Button>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-56">
                      <ContextMenuLabel className="max-w-[14rem] truncate">{folder}</ContextMenuLabel>
                      <ContextMenuItem onSelect={() => setSidebarFolder(folder)}>
                        <FolderInput className="mr-2 h-4 w-4" />
                        Filter to this folder
                      </ContextMenuItem>
                      <ContextMenuItem
                        onSelect={() => {
                          void navigator.clipboard.writeText(folder);
                          setStatus(`Copied folder name "${folder}".`);
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy folder name
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onSelect={() => openRenameFolderModal(folder)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Rename folder…
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={openNewFolderModal}>
                        <FolderPlus className="mr-2 h-4 w-4" />
                        New folder…
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => void handleDeleteFolder(folder)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete folder…
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                  {phoneViewport ? (
                    <Button
                      aria-label={`${folder} actions`}
                      className="h-9 w-9 shrink-0 touch-manipulation rounded-full p-0"
                      onClick={() => setMobileFolderActions({ open: true, kind: "folder", folderName: folder })}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-52">
                <ContextMenuLabel>Library folders</ContextMenuLabel>
                <ContextMenuItem onSelect={openNewFolderModal}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New folder…
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => setSidebarFolder("all")}>
                  <FolderInput className="mr-2 h-4 w-4" />
                  Show all pastes
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            {!sidebarShowsPublicFeed && batchSelected.size > 0 ? (
              <div className="mt-3 flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
                <p className="text-xs font-medium text-foreground">{batchSelected.size} selected</p>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    className="h-8 text-xs"
                    disabled={saving}
                    onClick={() => setBatchMoveOpen(true)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Move…
                  </Button>
                  <Button
                    className="h-8 text-xs"
                    disabled={saving}
                    onClick={() => void handleBatchDelete()}
                    size="sm"
                    type="button"
                    variant="destructive"
                  >
                    Delete
                  </Button>
                  <Button className="h-8 text-xs" onClick={clearBatchSelection} size="sm" type="button" variant="ghost">
                    Clear
                  </Button>
                </div>
              </div>
            ) : null}

            {!sidebarShowsPublicFeed ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button className="h-8 text-xs" onClick={selectAllVisibleBatch} size="sm" type="button" variant="outline">
                  Select visible
                </Button>
                <Button
                  className="h-8 px-2 text-xs text-muted-foreground"
                  disabled={batchSelected.size === 0}
                  onClick={clearBatchSelection}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Clear selection
                </Button>
              </div>
            ) : null}

            <div className="mt-3 space-y-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <ListOrdered className="h-3 w-3" />
                  Sort & filter
                </span>
                <Button
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setPinnedOnly((v) => !v)}
                  size="sm"
                  type="button"
                  variant={pinnedOnly ? "default" : "outline"}
                >
                  Pinned only
                </Button>
              </div>
              <select
                className="h-9 w-full min-w-0 rounded-lg border border-border bg-card/90 px-3 text-sm shadow-sm"
                id="wox-sort-order"
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                title="Sort order"
                value={sortOrder}
              >
                <option value="pinned_updated">Pinned first, by last update</option>
                <option value="updated">By last update</option>
                <option value="newest">Newest created</option>
                <option value="oldest">Oldest created</option>
                <option value="title">Title A–Z</option>
              </select>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  className="h-8 text-xs"
                  onClick={() => setListQuickFilter("all")}
                  size="sm"
                  type="button"
                  variant={listQuickFilter === "all" ? "default" : "outline"}
                >
                  Everything
                </Button>
                <Button
                  className="h-8 text-xs"
                  onClick={() => setListQuickFilter("favorites")}
                  size="sm"
                  type="button"
                  variant={listQuickFilter === "favorites" ? "default" : "outline"}
                >
                  Favorites
                </Button>
                <Button
                  className="h-8 text-xs"
                  onClick={() => setListQuickFilter("recent")}
                  size="sm"
                  type="button"
                  variant={listQuickFilter === "recent" ? "default" : "outline"}
                >
                  Recent
                </Button>
                <Button
                  className="h-8 text-xs"
                  onClick={() => setListQuickFilter("archived")}
                  size="sm"
                  type="button"
                  variant={listQuickFilter === "archived" ? "default" : "outline"}
                >
                  Archived
                </Button>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-4 workspace-scrollbar-hide">
            {loading ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">Loading workspace...</div>
            ) : sidebarFolder === PUBLIC_FEED_FOLDER && publicFeedLoading ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">Loading public feed…</div>
            ) : sidebarFolder === PUBLIC_FEED_FOLDER && publicFeedError ? (
              <div className="px-3 py-4 text-sm text-destructive">{publicFeedError}</div>
            ) : listAfterFilter.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">
                {sidebarFolder === PUBLIC_FEED_FOLDER
                  ? "No public pastes to show yet."
                  : "No pastes match the current search. Start with a new draft or import a text file / workspace JSON export."}
              </div>
            ) : (
              listAfterFilter.map((paste) => (
                <ContextMenu key={paste.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      className={`flex gap-2 rounded-[1.2rem] border p-3 transition ${
                        selectedPaste?.id === paste.id
                          ? "border-primary/50 bg-primary/10"
                          : "border-border bg-muted/40 hover:bg-muted/60"
                      }`}
                    >
                      {!sidebarShowsPublicFeed ? (
                        <input
                          aria-label={`Select ${paste.title}`}
                          checked={batchSelected.has(paste.id)}
                          className="mt-1.5 h-4 w-4 shrink-0 rounded border-border"
                          onChange={() => toggleBatchId(paste.id)}
                          onClick={(e) => e.stopPropagation()}
                          type="checkbox"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <button
                            className="min-w-0 flex-1 text-left"
                            onClick={() => {
                              setSelectedId(paste.id);
                              if (phoneViewport) {
                                setMobileLibraryOpen(false);
                              }
                            }}
                            type="button"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate font-medium text-foreground">{paste.title}</p>
                              <div className="flex shrink-0 flex-wrap items-center gap-1">
                                {paste.favorite ? (
                                  <Badge className="gap-0.5 border-amber-500/35 bg-amber-500/15 px-1.5 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
                                    <Star className="h-3 w-3" />
                                  </Badge>
                                ) : null}
                                {paste.archived ? (
                                  <Badge className="border-border bg-transparent">Archived</Badge>
                                ) : null}
                                {paste.pinned ? <Badge>Pinned</Badge> : null}
                              </div>
                            </div>
                            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                              {paste.content || "Empty paste"}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge>{paste.language}</Badge>
                              {paste.folder ? <Badge>{paste.folder}</Badge> : null}
                              <Badge>{paste.visibility}</Badge>
                            </div>
                          </button>
                          {phoneViewport ? (
                            <Button
                              aria-label={`${paste.title} actions`}
                              className="mt-0.5 h-9 w-9 shrink-0 touch-manipulation rounded-full p-0"
                              onClick={(event) => {
                                event.stopPropagation();
                                setMobilePasteActions({ open: true, pasteId: paste.id });
                              }}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-56">
                    <ContextMenuLabel className="max-w-[13rem] truncate">{paste.title}</ContextMenuLabel>
                    <ContextMenuItem
                      onSelect={() => {
                        setSelectedId(paste.id);
                        if (phoneViewport) {
                          setMobileLibraryOpen(false);
                        }
                      }}
                    >
                      <FilePlus2 className="mr-2 h-4 w-4" />
                      Open
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => duplicatePasteById(paste.id)}>
                      <WandSparkles className="mr-2 h-4 w-4" />
                      Fork
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onSelect={() => {
                        void navigator.clipboard.writeText(paste.content);
                        setStatus("Copied paste contents to clipboard.");
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy all text
                    </ContextMenuItem>
                    {paste.slug && !isAccountOnlyDraft(paste, mode) ? (
                      <>
                        <ContextMenuItem
                          disabled={paste.visibility === "private"}
                          onSelect={() => {
                            const url = getPasteShareUrl(window.location.origin, paste.slug, paste.secretMode);
                            void navigator.clipboard.writeText(url);
                            setStatus("Copied share link.");
                          }}
                        >
                          <Share2 className="mr-2 h-4 w-4" />
                          Copy share link
                        </ContextMenuItem>
                        <ContextMenuItem
                          disabled={paste.visibility === "private"}
                          onSelect={() => {
                            const url = `${window.location.origin}/raw/${paste.slug}`;
                            void navigator.clipboard.writeText(url);
                            setStatus("Copied raw URL.");
                          }}
                        >
                          <Link2 className="mr-2 h-4 w-4" />
                          Copy raw URL
                        </ContextMenuItem>
                      </>
                    ) : null}
                    {!sidebarShowsPublicFeed ? (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuSub>
                          <ContextMenuSubTrigger>Move to folder</ContextMenuSubTrigger>
                          <ContextMenuSubContent className="max-h-64 overflow-y-auto">
                            {snapshot.folders.length === 0 ? (
                              <ContextMenuItem disabled>No folders yet</ContextMenuItem>
                            ) : (
                              snapshot.folders.map((f) => (
                                <ContextMenuItem key={f} onSelect={() => void movePasteToFolder(paste.id, f)}>
                                  {f}
                                </ContextMenuItem>
                              ))
                            )}
                            <ContextMenuSeparator />
                            <ContextMenuItem
                              onSelect={() => {
                                setBatchSelected(new Set([paste.id]));
                                setBatchMoveOpen(true);
                              }}
                            >
                              Other folder / new name…
                            </ContextMenuItem>
                          </ContextMenuSubContent>
                        </ContextMenuSub>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onSelect={() =>
                            setBatchSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(paste.id)) {
                                next.delete(paste.id);
                              } else {
                                next.add(paste.id);
                              }
                              return next;
                            })
                          }
                        >
                          {batchSelected.has(paste.id) ? "Deselect for batch" : "Select for batch"}
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => void deletePasteById(paste.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {isAccountOnlyDraft(paste, mode) ? "Discard draft" : "Delete"}
                        </ContextMenuItem>
                      </>
                    ) : null}
                  </ContextMenuContent>
                </ContextMenu>
              ))
            )}
          </div>

          <div className="border-t border-border px-5 py-4">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => fileInputRef.current?.click()} size="sm" type="button" variant="outline">
                <Upload className="h-4 w-4" />
                Import file
              </Button>
              <Button onClick={() => void handleExportWorkspace()} size="sm" type="button" variant="outline">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
            <input
              accept={WORKSPACE_FILE_IMPORT_ACCEPT}
              aria-label="Import workspace backup or text file"
              className="hidden"
              onChange={handleImportFile}
              ref={fileInputRef}
              type="file"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground/80">JSON backup</span> restores the local library.{" "}
              <span className="font-medium text-foreground/80">.txt, .md, code</span> and similar files create one new paste
              (syntax from the file extension). Use “All files” in the picker if an extension is not listed.
              {!sidebarShowsPublicFeed ? (
                <>
                  {" "}
                  <span className="font-medium text-foreground/80">Drag &amp; drop</span> anywhere on this library panel to import.
                </>
              ) : null}
            </p>
          </div>
        </CardContent>
      </Card>
      </FileDropSurface>
    );
  }

  function renderEditor() {
    const sortedWorkspaceFolders = [...snapshot.folders].sort((a, b) => a.localeCompare(b));
    return (
      <Card
        className={cn(
          "flex h-full min-h-0 flex-1 flex-col overflow-hidden print:h-auto print:min-h-0 print:overflow-visible print:border-0 print:shadow-none",
          !selectedPaste && "print:hidden"
        )}
      >
        <CardContent
          className={cn(
            "flex min-h-0 flex-1 flex-col p-3 print:overflow-visible sm:p-4 lg:p-6",
            selectedPaste ? "overflow-hidden" : "gap-4 overflow-y-auto workspace-scrollbar-hide sm:gap-6"
          )}
        >
          {selectedPaste ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden print:overflow-visible">
                <div
                  className={cn(
                    "shrink-0 z-20 -mx-3 isolate box-border flex flex-col justify-start border-b border-border px-3 [overflow-anchor:none] print:-mx-0 print:border-0 print:bg-transparent print:px-0 print:pb-2 print:shadow-none sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6",
                    editorPaneCompact ? "bg-card shadow-md supports-[backdrop-filter]:bg-card" : "bg-card/98 backdrop-blur-md supports-[backdrop-filter]:bg-card/95",
                    editorPaneCompact ? "pb-2 shadow-md" : "pb-3 shadow-none max-lg:pb-2 sm:pb-4"
                  )}
                  style={{ transition: "box-shadow 180ms ease-out" }}
                >
                  <div className={cn("pt-0.5 sm:pt-1", editorPaneCompact ? "space-y-2" : "space-y-2 max-lg:space-y-2 sm:space-y-4")}>
                    {!editorPaneCompact ? (
                      <div className="max-lg:hidden">
                        <PrismThemeLink theme={syntaxTheme} />
                      </div>
                    ) : null}
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3 md:gap-4">
                      <div className="min-w-0 w-full flex-1 sm:w-auto">
                        {phoneViewport ? (
                          <Textarea
                            className={cn(
                              "min-h-0 resize-none overflow-hidden border-none bg-transparent px-0 py-0 font-semibold shadow-none focus-visible:ring-0 print:hidden",
                              editorPaneCompact ? "text-lg leading-snug" : "text-2xl leading-tight"
                            )}
                            disabled={!selectedPasteInWorkspace}
                            onChange={(event) =>
                              updateSelectedPaste((paste) => ({
                                ...paste,
                                title: event.target.value,
                                updatedAt: new Date().toISOString()
                              }))
                            }
                            onInput={(event) => {
                              const target = event.currentTarget;
                              target.style.height = "0px";
                              target.style.height = `${Math.min(target.scrollHeight, 144)}px`;
                            }}
                            rows={1}
                            style={{ height: "auto" }}
                            value={selectedPaste.title}
                          />
                        ) : (
                          <Input
                            className={cn(
                              "border-none bg-transparent px-0 font-semibold shadow-none focus-visible:ring-0 print:hidden",
                              editorPaneCompact
                                ? "text-lg leading-snug sm:text-xl"
                                : "text-xl leading-tight md:text-3xl"
                            )}
                            disabled={!selectedPasteInWorkspace}
                            onChange={(event) =>
                              updateSelectedPaste((paste) => ({
                                ...paste,
                                title: event.target.value,
                                updatedAt: new Date().toISOString()
                              }))
                            }
                            value={selectedPaste.title}
                          />
                        )}
                        <h1 className="wox-print-title hidden text-2xl font-semibold leading-tight text-black print:block dark:print:text-black">
                          {selectedPaste.title.trim() || "Untitled"}
                        </h1>
                        <p className="wox-print-title hidden text-sm text-neutral-700 print:block dark:print:text-neutral-800">
                          {selectedPaste.language}
                          {selectedPaste.folder ? ` · ${selectedPaste.folder}` : ""}
                          {` · Updated ${formatDate(selectedPaste.updatedAt)}`}
                        </p>
                        {!editorPaneCompact ? (
                          <div className="mt-1.5 hidden flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground print:hidden sm:mt-2 sm:flex">
                            <span>
                              {mode === "account"
                                ? "Saved to Neon/Postgres through the account workspace."
                                : "Stored locally in IndexedDB until you choose to sync or export."}
                            </span>
                            {mode === "account" && autosaveHint !== "idle" ? (
                              <span className="text-xs font-medium text-primary/90">
                                {autosaveHint === "pending" ? "Autosave…" : "Saved"}
                              </span>
                            ) : null}
                          </div>
                        ) : mode === "account" && autosaveHint !== "idle" ? (
                          <p className="mt-0.5 text-[10px] font-medium text-primary/90 print:hidden">
                            {autosaveHint === "pending" ? "Autosave…" : "Saved"}
                          </p>
                        ) : null}
                        {!editorPaneCompact && selectedPasteLineageDisplay ? (
                          <PasteLineageBanner
                            className="mt-3 max-w-2xl print:hidden"
                            forkedFrom={selectedPasteLineageDisplay.forkedFrom}
                            plain={mode === "local"}
                            replyTo={selectedPasteLineageDisplay.replyTo}
                          />
                        ) : null}
                      </div>
                      <div
                        className={cn(
                          "flex w-full print:hidden sm:w-auto sm:justify-end",
                          phoneViewport
                            ? "-mx-1 flex-nowrap gap-2 overflow-x-auto px-1 pb-1"
                            : "flex-wrap",
                          editorPaneCompact ? "gap-2" : "gap-2 sm:gap-3",
                          "[&>button]:touch-manipulation [&>button]:shrink-0",
                          phoneViewport
                            ? "[&>button]:h-9 [&>button]:min-h-9 [&>button]:px-3 [&>button]:text-xs sm:[&>button]:text-sm"
                            : "[&>button]:min-h-10 sm:[&>button]:min-h-0"
                        )}
                      >
                        <Button
                          className={phoneViewport ? "gap-1.5" : undefined}
                          disabled={saving || !selectedPasteInWorkspace}
                          onClick={() => void handleSavePaste()}
                          size={editorPaneCompact ? "sm" : "default"}
                          type="button"
                        >
                          <Save className="h-4 w-4" />
                          {saving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          className={phoneViewport ? "gap-1.5" : undefined}
                          onClick={handleDuplicatePaste}
                          size={editorPaneCompact ? "sm" : "default"}
                          type="button"
                          variant="outline"
                        >
                          <WandSparkles className="h-4 w-4" />
                          Fork
                        </Button>
                        <Button
                          className={phoneViewport ? "gap-1.5" : undefined}
                          disabled={!selectedPasteInWorkspace}
                          onClick={() => void handleDeletePaste()}
                          size={editorPaneCompact ? "sm" : "default"}
                          type="button"
                          variant="destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          {selectedPaste && isAccountOnlyDraft(selectedPaste, mode) ? "Discard" : "Delete"}
                        </Button>
                      </div>
                    </div>

                    {!phoneViewport ? (
                      <div className={cn("grid print:hidden md:grid-cols-2", editorPaneCompact ? "gap-2" : "gap-4")}>
                      <div>
                        <label
                          className={cn(
                            "block text-xs uppercase tracking-[0.24em] text-muted-foreground",
                            editorPaneCompact ? "mb-1" : "mb-2"
                          )}
                          htmlFor="wox-paste-language-select"
                        >
                          Language
                        </label>
                        <select
                          className={cn(
                            "w-full rounded-2xl border border-border bg-card/80",
                            editorPaneCompact ? "h-9 px-3 text-xs" : "h-11 px-4 text-sm"
                          )}
                          disabled={!selectedPasteInWorkspace}
                          id="wox-paste-language-select"
                          title="Paste language or format"
                    onChange={(event) =>
                      updateSelectedPaste((paste) => ({
                        ...paste,
                        language: event.target.value,
                        updatedAt: new Date().toISOString()
                      }))
                    }
                          value={selectedPaste.language}
                        >
                          {LANGUAGES.map((language) => (
                            <option key={language} value={language}>
                              {language}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          className={cn(
                            "block text-xs uppercase tracking-[0.24em] text-muted-foreground",
                            editorPaneCompact ? "mb-1" : "mb-2"
                          )}
                          htmlFor="wox-folder-select"
                        >
                          Folder
                        </label>
                        {(() => {
                          const fv = selectedPaste.folder ?? null;
                          const inList = Boolean(fv && snapshot.folders.includes(fv));
                          const folderSelectValue = folderDraftMode
                            ? "__new__"
                            : !fv
                              ? "__none__"
                              : inList
                                ? fv
                                : "__custom__";
                          return (
                            <>
                              <select
                                className={cn(
                                  "w-full rounded-2xl border border-border bg-card/80",
                                  editorPaneCompact ? "h-9 px-3 text-xs" : "h-11 px-4 text-sm"
                                )}
                                disabled={!selectedPasteInWorkspace}
                                id="wox-folder-select"
                                onChange={(event) => {
                                  const v = event.target.value;
                                  const iso = new Date().toISOString();
                                  if (v === "__none__") {
                                    setFolderDraftMode(false);
                                    updateSelectedPaste((paste) => ({
                                      ...paste,
                                      folder: null,
                                      updatedAt: iso
                                    }));
                                    return;
                                  }
                                  if (v === "__new__") {
                                    setFolderDraftMode(true);
                                    updateSelectedPaste((paste) => ({
                                      ...paste,
                                      folder: null,
                                      updatedAt: iso
                                    }));
                                    return;
                                  }
                                  if (v === "__custom__") {
                                    return;
                                  }
                                  setFolderDraftMode(false);
                                  updateSelectedPaste((paste) => ({
                                    ...paste,
                                    folder: v,
                                    updatedAt: iso
                                  }));
                                }}
                                value={folderSelectValue}
                              >
                                <option value="__none__">No folder</option>
                                {sortedWorkspaceFolders.map((folder) => (
                                  <option key={folder} value={folder}>
                                    {folder}
                                  </option>
                                ))}
                                <option value="__new__">+ New folder…</option>
                                {folderSelectValue === "__custom__" && fv ? (
                                  <option value="__custom__">{fv} (custom)</option>
                                ) : null}
                              </select>
                              {folderDraftMode || folderSelectValue === "__custom__" ? (
                                <Input
                                  aria-label="Folder name"
                                  className="mt-2"
                                  disabled={!selectedPasteInWorkspace}
                                  onBlur={() => {
                                    ensureFolderListed(selectedPaste.folder ?? null);
                                    setFolderDraftMode(false);
                                  }}
                                  onChange={(event) => {
                                    const raw = event.target.value;
                                    updateSelectedPaste((paste) => ({
                                      ...paste,
                                      folder: raw.trim() ? raw : null,
                                      updatedAt: new Date().toISOString()
                                    }));
                                  }}
                                  placeholder="Folder name"
                                  value={selectedPaste.folder ?? ""}
                                />
                              ) : null}
                            </>
                          );
                        })()}
                      </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-2 border-t border-border/40 pt-2 print:hidden">
                    <WorkspaceEditorRibbon
                      activeIndentGuides={editorActiveIndentGuides}
                      compact={editorPaneCompact}
                collapsed={ribbonCollapsed}
                findOpen={findOpen}
                fontSize={editorFontSize}
                formatJsonDisabled={!selectedPaste}
                importUrlDisabled={!sessionUser}
                isMarkdown={selectedPaste?.language === "markdown"}
                lineNumbers={editorLineNumbers}
                mdPreviewOpen={mdPreviewOpen}
                onBold={() => editorApplyRangeEdit((v, s, e) => wrapSelection(v, s, e, "**", "**"))}
                onBulletList={() => editorApplyRangeEdit(bulletBlock)}
                onCaseLower={() => editorApplyRangeEdit((v, s, e) => transformSelectionCase(v, s, e, "lower"))}
                onCaseTitle={() => editorApplyRangeEdit((v, s, e) => transformSelectionCase(v, s, e, "title"))}
                onCaseUpper={() => editorApplyRangeEdit((v, s, e) => transformSelectionCase(v, s, e, "upper"))}
                onCopyAll={handleEditorCopyAll}
                onCopySelection={editorCopySelection}
                onCut={editorCutSelection}
                onDedupeLines={() => editorApplyRangeEdit(dedupeLinesInBlock)}
                onDuplicateBlock={() => editorApplyRangeEdit(duplicateBlockLines)}
                onFontSizeChange={setEditorFontSize}
                onFormatJson={handleFormatJsonInEditor}
                onIndent={() => editorApplyRangeEdit(applyTab)}
                onInlineCode={() => editorApplyRangeEdit((v, s, e) => wrapSelection(v, s, e, "`", "`"))}
                onInsertCodeFence={() => editorApplyRangeEdit((v, s, e) => insertCodeFence(v, s, e, ""))}
                onInsertHeading={() => editorApplyRangeEdit((v, s, e) => insertAtSelection(v, s, e, "# "))}
                onInsertHr={() => editorApplyRangeEdit(insertHorizontalRule)}
                onInsertLink={() =>
                  editorApplyRangeEdit((v, s, e) => insertAtSelection(v, s, e, "[Link text](https://example.com)"))
                }
                onInsertTable={() => editorApplyRangeEdit(insertMarkdownTable)}
                onInsertTimestamp={() => editorApplyRangeEdit((v, s, e) => insertAtSelection(v, s, e, `${timestampLocal()}\n`))}
                onInsertUuid={() =>
                  editorApplyRangeEdit((v, s, e) => insertAtSelection(v, s, e, `${crypto.randomUUID()}\n`))
                }
                onItalic={() => editorApplyRangeEdit((v, s, e) => wrapSelection(v, s, e, "*", "*"))}
                onMinifyJson={handleMinifyJsonInEditor}
                onNumberList={() => editorApplyRangeEdit(numberBlock)}
                onOpenCodeImage={() => setCodeImageOpen(true)}
                onOpenImportUrl={() => setImportUrlOpen(true)}
                onOpenShortcuts={() => setShortcutsOpen(true)}
                onOpenTemplates={() => setTemplatesOpen(true)}
                onOutdent={() => editorApplyRangeEdit(applyShiftTab)}
                onPaste={editorPasteFromClipboard}
                onPrint={handlePrintWorkspace}
                onPrintLayoutPresetChange={setPrintLayoutPreset}
                onQuote={() => editorApplyRangeEdit(quoteBlock)}
                onTogglePrintWrapLongLines={() => setPrintWrapLongLines((v) => !v)}
                printLayoutPreset={printLayoutPreset}
                printWrapLongLines={printWrapLongLines}
                onSelectAll={handleEditorSelectAll}
                onSortLines={() => editorApplyRangeEdit(sortLinesInBlock)}
                onStrike={() => editorApplyRangeEdit((v, s, e) => wrapSelection(v, s, e, "~~", "~~"))}
                onTabChange={setRibbonTab}
                onToggleCollapsed={() => setRibbonCollapsed((c) => !c)}
                onToggleFind={() => setFindOpen((v) => !v)}
                onToggleActiveIndentGuides={() => setEditorActiveIndentGuides((v) => !v)}
                onToggleLineNumbers={() => setEditorLineNumbers((v) => !v)}
                onToggleMdPreview={toggleMdPreviewRibbon}
                onToggleReplace={() => setReplaceOpen((v) => !v)}
                onToggleWordWrap={() => setEditorWordWrap((v) => !v)}
                onTrimTrailing={() => editorApplyRangeEdit(trimTrailingInBlock)}
                onUnderline={() => editorApplyRangeEdit((v, s, e) => wrapSelection(v, s, e, "<u>", "</u>"))}
                pasteEditable={Boolean(selectedPaste && selectedPasteInWorkspace)}
                replaceOpen={replaceOpen}
                tab={ribbonTab}
                wordWrap={editorWordWrap}
                    />
                  </div>
                </div>
              <div
                ref={editorPaneScrollRef}
                className="min-h-0 min-w-0 flex-1 overflow-auto [overflow-anchor:none] print:h-auto print:min-h-0 print:overflow-visible workspace-scrollbar-hide"
                onScroll={(e) => {
                  const st = e.currentTarget.scrollTop;
                  setEditorPaneCompact((prev) => {
                    if (st <= EDITOR_SCROLL_COMPACT_EXIT) {
                      return false;
                    }
                    if (st >= EDITOR_SCROLL_COMPACT_ENTER) {
                      return true;
                    }
                    return prev;
                  });
                }}
              >
                <div className="space-y-6 pt-3 print:space-y-4 print:pt-0">
                  {findOpen ? (
                <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-muted/40 p-3 print:hidden">
                  <div className="min-w-[160px] flex-1">
                    <label className="text-xs text-muted-foreground" htmlFor="wox-find-input">
                      Find in paste
                    </label>
                    <Input
                      className="mt-1"
                      id="wox-find-input"
                      onChange={(e) => setFindQuery(e.target.value)}
                      placeholder="Search text…"
                      value={findQuery}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {findQuery
                      ? `${findMatches.length} match${findMatches.length === 1 ? "" : "es"}`
                      : "Type to search"}
                  </p>
                  <Button
                    disabled={!findMatches.length}
                    onClick={() => findInPasteNext(true)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Prev
                  </Button>
                  <Button
                    disabled={!findMatches.length}
                    onClick={() => findInPasteNext(false)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Next
                  </Button>
                  <Button
                    disabled={!findMatches.length}
                    onClick={() => findQuery && focusFindMatch(0)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    First
                  </Button>
                </div>
              ) : null}

              {replaceOpen ? (
                <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-muted/40 p-3 print:hidden">
                  <div className="min-w-[140px] flex-1">
                    <label className="text-xs text-muted-foreground" htmlFor="wox-rep-find">
                      Find
                    </label>
                    <Input
                      className="mt-1"
                      id="wox-rep-find"
                      onChange={(e) => setReplaceFind(e.target.value)}
                      value={replaceFind}
                    />
                  </div>
                  <div className="min-w-[140px] flex-1">
                    <label className="text-xs text-muted-foreground" htmlFor="wox-rep-with">
                      Replace with
                    </label>
                    <Input
                      className="mt-1"
                      id="wox-rep-with"
                      onChange={(e) => setReplaceWith(e.target.value)}
                      value={replaceWith}
                    />
                  </div>
                  <Button onClick={() => replaceInPasteOne()} size="sm" type="button" variant="outline">
                    Replace
                  </Button>
                  <Button onClick={() => replaceInPasteAll()} size="sm" type="button" variant="destructive">
                    Replace all
                  </Button>
                </div>
              ) : null}

              <div
                className={
                  mdPreviewOpen && selectedPaste.language === "markdown"
                    ? "grid min-h-[min(52dvh,28rem)] gap-5 sm:gap-6 md:min-h-[55vh] lg:grid-cols-2 print:min-h-0 print:grid-cols-1 print:gap-4"
                    : "grid min-h-[min(52dvh,28rem)] grid-cols-1 gap-5 md:min-h-[55vh] print:min-h-0 print:gap-4"
                }
              >
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <div className="min-h-0 min-w-0 outline-none print:h-auto print:min-h-0 [&:focus]:outline-none" data-tutorial="editor-main">
                      <PrismOverlayEditor
                        activeIndentGuides={editorActiveIndentGuides}
                        className="print:overflow-visible"
                        editorFontSizePx={effectiveEditorFontPx}
                        enableFileDrop={selectedPasteInWorkspace}
                        language={selectedPaste.language}
                        lineNumbers={editorLineNumbers}
                        minHeight="min-h-[min(48dvh,26rem)] md:min-h-[50vh]"
                        onChange={(next) =>
                          updateSelectedPaste((paste) => ({
                            ...paste,
                            content: next,
                            updatedAt: new Date().toISOString()
                          }))
                        }
                        onScrollInfo={handleMainEditorScrollInfo}
                        placeholder="Start writing or paste code here… (drop a text file to append)"
                        readOnly={!selectedPasteInWorkspace}
                        ref={mainEditorRef}
                        syntaxLight={isLightSyntaxTheme(syntaxTheme)}
                        value={selectedPaste.content}
                        wordWrap={editorWordWrap}
                      />
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-56">
                    <ContextMenuLabel>Editor</ContextMenuLabel>
                    <ContextMenuItem onSelect={editorCutSelection}>
                      <Scissors className="mr-2 h-4 w-4" />
                      Cut
                      <ContextMenuShortcut>⌘X</ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={editorCopySelection}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                      <ContextMenuShortcut>⌘C</ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={editorPasteFromClipboard}>
                      <ClipboardPaste className="mr-2 h-4 w-4" />
                      Paste
                      <ContextMenuShortcut>⌘V</ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={handleEditorCopyAll}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy all
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={handleEditorSelectAll}>
                      Select all
                      <ContextMenuShortcut>⌘A</ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onSelect={() => {
                        setFindOpen(true);
                        setRibbonTab("home");
                      }}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Find…
                    </ContextMenuItem>
                    <ContextMenuItem
                      onSelect={() => {
                        setReplaceOpen(true);
                        setRibbonTab("home");
                      }}
                    >
                      Replace…
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>
                        <FileJson className="mr-2 h-4 w-4" />
                        JSON
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent className="w-48">
                        <ContextMenuItem onSelect={() => void handleFormatJsonInEditor()}>
                          Pretty-print document
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => void handleMinifyJsonInEditor()}>
                          Minify document
                        </ContextMenuItem>
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                    <ContextMenuItem onSelect={editorSelectBracketPair}>
                      <Brackets className="mr-2 h-4 w-4" />
                      Select matching bracket
                      <ContextMenuShortcut>⌘⇧B</ContextMenuShortcut>
                    </ContextMenuItem>
                    {selectedPaste.language === "markdown" ? (
                      <ContextMenuItem
                        onSelect={() => {
                          toggleMdPreviewRibbon();
                          setRibbonTab("home");
                        }}
                      >
                        <PanelRight className="mr-2 h-4 w-4" />
                        {mdPreviewOpen ? "Hide Markdown preview" : "Show Markdown preview"}
                      </ContextMenuItem>
                    ) : null}
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => void handlePrintWorkspace()}>
                      <Printer className="mr-2 h-4 w-4" />
                      Print…
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => setCodeImageOpen(true)}>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Export code as image…
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => setTemplatesOpen(true)}>
                      <LayoutTemplate className="mr-2 h-4 w-4" />
                      Templates…
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => setShortcutsOpen(true)}>
                      <Keyboard className="mr-2 h-4 w-4" />
                      Keyboard shortcuts…
                    </ContextMenuItem>
                    {sessionUser ? (
                      <ContextMenuItem onSelect={() => setImportUrlOpen(true)}>
                        <Link2 className="mr-2 h-4 w-4" />
                        Import from URL…
                      </ContextMenuItem>
                    ) : null}
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => setEditorWordWrap((w) => !w)}>
                      {editorWordWrap ? "Disable word wrap" : "Enable word wrap"}
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={editorWordWrap}
                      onSelect={() => setEditorActiveIndentGuides((g) => !g)}
                    >
                      {editorActiveIndentGuides ? "Hide active indent guides" : "Show active indent guides"}
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => setEditorLineNumbers((n) => !n)}>
                      {editorLineNumbers ? "Hide line numbers" : "Show line numbers"}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => void handleSavePaste()}>
                      <Save className="mr-2 h-4 w-4" />
                      Save paste
                      <ContextMenuShortcut>⌘S</ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={handleDuplicatePaste}>
                      <WandSparkles className="mr-2 h-4 w-4" />
                      Fork paste
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={editorClearDocument}
                    >
                      <Eraser className="mr-2 h-4 w-4" />
                      Clear document…
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
                {mdPreviewOpen && selectedPaste.language === "markdown" ? (
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <div
                        className="wox-user-markdown wox-markdown-preview max-h-[70vh] min-h-[50vh] overflow-auto rounded-[1.25rem] border border-border bg-muted/60 p-4 text-sm leading-relaxed text-foreground workspace-scrollbar-hide outline-none print:hidden dark:bg-black/30"
                        dangerouslySetInnerHTML={{
                          __html: markdownPreviewHtml || "<p class='text-muted-foreground'>Nothing to preview.</p>"
                        }}
                        onScroll={(e) => {
                          const pv = e.currentTarget;
                          if (mdScrollLock.current === "editor") {
                            return;
                          }
                          mdScrollLock.current = "preview";
                          const pvMax = Math.max(1, pv.scrollHeight - pv.clientHeight);
                          const ratio = pvMax ? pv.scrollTop / pvMax : 0;
                          mainEditorRef.current?.setScrollRatio(ratio);
                          requestAnimationFrame(() => {
                            mdScrollLock.current = null;
                          });
                        }}
                        ref={mdPreviewRef}
                      />
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-52">
                      <ContextMenuLabel>Markdown preview</ContextMenuLabel>
                      <ContextMenuItem
                        onSelect={() => {
                          void navigator.clipboard.writeText(selectedPaste.content);
                          setStatus("Copied Markdown source.");
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Markdown source
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={toggleMdPreviewRibbon}>
                        <PanelRight className="mr-2 h-4 w-4" />
                        Toggle preview pane
                      </ContextMenuItem>
                      {!isAccountOnlyDraft(selectedPaste, mode) &&
                      selectedPaste.slug &&
                      selectedPaste.visibility !== "private" ? (
                        <ContextMenuItem
                          onSelect={() => {
                            window.open(
                              getPasteShareUrl(window.location.origin, selectedPaste.slug, selectedPaste.secretMode),
                              "_blank",
                              "noopener,noreferrer"
                            );
                          }}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open public page
                        </ContextMenuItem>
                      ) : null}
                      {!isAccountOnlyDraft(selectedPaste, mode) &&
                      selectedPaste.slug &&
                      selectedPaste.visibility !== "private" ? (
                        <ContextMenuItem
                          onSelect={() => {
                            const url = `${window.location.origin}/raw/${selectedPaste.slug}`;
                            void navigator.clipboard.writeText(url);
                            setStatus("Copied raw URL.");
                          }}
                        >
                          <Link2 className="mr-2 h-4 w-4" />
                          Copy raw URL
                        </ContextMenuItem>
                      ) : null}
                    </ContextMenuContent>
                  </ContextMenu>
                ) : null}
              </div>

              <FileDropSurface
                activeClassName="rounded-2xl ring-2 ring-primary/20"
                className="relative space-y-4 print:hidden"
                data-tutorial="files-section"
                disabled={!selectedPasteInWorkspace}
                onFiles={(files) => {
                  for (const f of files) {
                    attachMediaFromFile(f, null);
                  }
                }}
                overlayClassName="rounded-2xl"
                overlayMessage="Drop images or videos to attach"
              >
                <input
                  accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/bmp,video/mp4,video/webm,video/quicktime,video/ogg"
                  aria-label="Attach image or video file to this paste"
                  className="hidden"
                  onChange={handlePasteAttachmentMediaPick}
                  ref={pasteMediaFileInputRef}
                  tabIndex={-1}
                  type="file"
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Files</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Text/code attachments plus optional images and videos (stored as base64; counts toward your paste size
                      limit). <span className="font-medium text-foreground/85">Drag &amp; drop</span> media here.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={!selectedPasteInWorkspace}
                      onClick={() => {
                        setPasteMediaAttachIndex(null);
                        pasteMediaFileInputRef.current?.click();
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <ImageIcon className="h-4 w-4" />
                      <Video className="h-4 w-4" />
                      Add media
                    </Button>
                    <Button
                      disabled={!selectedPasteInWorkspace}
                      onClick={() =>
                        updateSelectedPaste((paste) => ({
                          ...paste,
                          files: [
                            ...paste.files,
                            {
                              filename: `file-${paste.files.length + 1}.txt`,
                              content: "",
                              language: paste.language,
                              mediaKind: null,
                              mimeType: null
                            }
                          ],
                          updatedAt: new Date().toISOString()
                        }))
                      }
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <FilePlus2 className="h-4 w-4" />
                      Add file
                    </Button>
                  </div>
                </div>

                {selectedPaste.files.length === 0 ? (
                  <div className="rounded-[1.25rem] border border-dashed border-border bg-muted/50 p-4 text-sm text-muted-foreground dark:bg-black/10">
                    No attached files yet. Add a text file for extra snippets, attach an image or video, or{" "}
                    <span className="font-medium text-foreground/85">drop media files</span> into this section.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedPaste.files.map((file, index) => {
                      const isMedia = isPasteFileMedia(file);
                      const mediaSrc = isMedia ? dataUrlFromPasteFile(file) : null;
                      return (
                        <div key={`${file.filename}-${index}`} className="rounded-[1.25rem] border border-border bg-muted/40 p-4">
                          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                            <Input
                              disabled={!selectedPasteInWorkspace}
                              onChange={(event) =>
                                updateSelectedPaste((paste) => ({
                                  ...paste,
                                  files: paste.files.map((entry, entryIndex) =>
                                    entryIndex === index ? { ...entry, filename: event.target.value } : entry
                                  ),
                                  updatedAt: new Date().toISOString()
                                }))
                              }
                              placeholder="Filename"
                              value={file.filename}
                            />
                            {isMedia ? (
                              <div className="flex h-11 items-center">
                                <Badge className="capitalize border-border bg-muted text-foreground">{file.mediaKind}</Badge>
                              </div>
                            ) : (
                              <select
                                className="h-11 w-full rounded-2xl border border-border bg-card/80 px-4 text-sm"
                                disabled={!selectedPasteInWorkspace}
                                id={`wox-paste-file-language-${index}`}
                                title="Syntax highlighting language for this attachment"
                                onChange={(event) =>
                                  updateSelectedPaste((paste) => ({
                                    ...paste,
                                    files: paste.files.map((entry, entryIndex) =>
                                      entryIndex === index
                                        ? {
                                            ...entry,
                                            language: event.target.value,
                                            mediaKind: null,
                                            mimeType: null
                                          }
                                        : entry
                                    ),
                                    updatedAt: new Date().toISOString()
                                  }))
                                }
                                value={file.language}
                              >
                                {LANGUAGES.map((language) => (
                                  <option key={`${file.filename}-${language}`} value={language}>
                                    {language}
                                  </option>
                                ))}
                              </select>
                            )}
                            <div className="flex flex-wrap items-center gap-1">
                              {isMedia ? (
                                <Button
                                  disabled={!selectedPasteInWorkspace}
                                  onClick={() => {
                                    setPasteMediaAttachIndex(index);
                                    pasteMediaFileInputRef.current?.click();
                                  }}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  Replace
                                </Button>
                              ) : null}
                              <Button
                                disabled={!selectedPasteInWorkspace}
                                onClick={() =>
                                  updateSelectedPaste((paste) => ({
                                    ...paste,
                                    files: paste.files.filter((_, entryIndex) => entryIndex !== index),
                                    updatedAt: new Date().toISOString()
                                  }))
                                }
                                size="sm"
                                type="button"
                                variant="ghost"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                          {isMedia && mediaSrc ? (
                            <ContextMenu>
                              <ContextMenuTrigger asChild>
                                <div className="mt-3 overflow-hidden rounded-[1rem] border border-border bg-black/20">
                                  {file.mediaKind === "image" ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      alt=""
                                      className="max-h-[min(70vh,520px)] w-full object-contain"
                                      src={mediaSrc}
                                    />
                                  ) : (
                                    <video className="max-h-[min(70vh,520px)] w-full" controls preload="metadata" src={mediaSrc} />
                                  )}
                                </div>
                              </ContextMenuTrigger>
                              <ContextMenuContent className="w-52">
                                <ContextMenuLabel className="max-w-[12rem] truncate">{file.filename}</ContextMenuLabel>
                                <ContextMenuItem
                                  onSelect={() => {
                                    const url = dataUrlFromPasteFile(file);
                                    if (url) {
                                      void navigator.clipboard.writeText(url);
                                      setStatus("Copied data URL (can be large).");
                                    }
                                  }}
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy data URL
                                </ContextMenuItem>
                                <ContextMenuItem
                                  onSelect={() => {
                                    void navigator.clipboard.writeText(file.filename);
                                    setStatus(`Copied filename "${file.filename}".`);
                                  }}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Copy filename
                                </ContextMenuItem>
                              </ContextMenuContent>
                            </ContextMenu>
                          ) : null}
                          {!isMedia ? (
                            <ContextMenu>
                              <ContextMenuTrigger asChild>
                                <div className="mt-3 min-h-0 outline-none [&:focus]:outline-none">
                                  <PrismOverlayEditor
                                    activeIndentGuides={editorActiveIndentGuides}
                                    editorFontSizePx={effectiveEditorFontPx}
                                    enableFileDrop={selectedPasteInWorkspace}
                                    language={file.language}
                                    lineNumbers={false}
                                    minHeight="min-h-[180px]"
                                    onChange={(next) =>
                                      updateSelectedPaste((paste) => ({
                                        ...paste,
                                        files: paste.files.map((entry, entryIndex) =>
                                          entryIndex === index ? { ...entry, content: next } : entry
                                        ),
                                        updatedAt: new Date().toISOString()
                                      }))
                                    }
                                    placeholder="File content"
                                    readOnly={!selectedPasteInWorkspace}
                                    syntaxLight={isLightSyntaxTheme(syntaxTheme)}
                                    value={file.content}
                                    wordWrap={editorWordWrap}
                                  />
                                </div>
                              </ContextMenuTrigger>
                              <ContextMenuContent className="w-52">
                                <ContextMenuLabel className="max-w-[12rem] truncate">{file.filename}</ContextMenuLabel>
                                <ContextMenuItem
                                  onSelect={() => {
                                    void navigator.clipboard.writeText(file.content);
                                    setStatus(`Copied "${file.filename}" to clipboard.`);
                                  }}
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy all
                                </ContextMenuItem>
                                <ContextMenuItem
                                  onSelect={() => {
                                    void navigator.clipboard.writeText(file.filename);
                                    setStatus(`Copied filename "${file.filename}".`);
                                  }}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Copy filename
                                </ContextMenuItem>
                                <ContextMenuItem
                                  onSelect={() => {
                                    if (!confirm(`Clear contents of "${file.filename}"?`)) {
                                      return;
                                    }
                                    updateSelectedPaste((paste) => ({
                                      ...paste,
                                      files: paste.files.map((entry, entryIndex) =>
                                        entryIndex === index ? { ...entry, content: "" } : entry
                                      ),
                                      updatedAt: new Date().toISOString()
                                    }));
                                  }}
                                >
                                  <Eraser className="mr-2 h-4 w-4" />
                                  Clear file…
                                </ContextMenuItem>
                              </ContextMenuContent>
                            </ContextMenu>
                          ) : null}
                          {isMedia && !mediaSrc ? (
                            <p className="mt-3 text-sm text-destructive">
                              Missing or invalid media data. Replace the attachment or remove it.
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </FileDropSurface>

              <div className="print:hidden" data-tutorial="comments-section">
                <WorkspacePasteComments
                  signedIn={Boolean(sessionUser)}
                  slug={
                    !isAccountOnlyDraft(selectedPaste, mode) ? (selectedPaste.slug ?? null) : null
                  }
                />
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground print:hidden">
                <span>{selectedPaste.content.length} characters</span>
                <span>{selectedPaste.content.trim() ? selectedPaste.content.trim().split(/\s+/).length : 0} words</span>
                <span>{selectedPaste.viewCount.toLocaleString()} view{selectedPaste.viewCount === 1 ? "" : "s"}</span>
                <span>Updated {formatDate(selectedPaste.updatedAt)}</span>
              </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <PrismThemeLink theme={syntaxTheme} />
            <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 text-center print:hidden">
              <p className="text-2xl font-semibold">Nothing selected yet</p>
              <p className="max-w-md text-sm leading-7 text-muted-foreground">
                Start a new paste, import your existing archive, or sign in to sync everything to the hosted workspace.
              </p>
              <Button onClick={handleNewPaste} type="button">
                <FilePlus2 className="h-4 w-4" />
                Create a paste
              </Button>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  function renderDetails() {
    const sortedWorkspaceFolders = [...snapshot.folders].sort((a, b) => a.localeCompare(b));
    return (
      <div className="workspace-details flex h-full min-h-0 flex-col gap-5 overflow-y-auto workspace-scrollbar-hide" data-tutorial="details-panel">
        {sessionUser && mode === "account" && accountPlan ? (
          <Card>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Plan</p>
                  <h2 className="mt-2 text-xl font-semibold">Hosted usage</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                  className={
                    accountPlan.isPaid
                      ? "border-amber-500/35 bg-amber-500/15 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"
                      : undefined
                  }
                >
                    {formatPlanName(accountPlan.plan)}
                  </Badge>
                  <Badge className="capitalize border-border bg-transparent text-muted-foreground">
                    {formatPlanStatus(accountPlan.planStatus)}
                  </Badge>
                </div>
              </div>

              {accountPlan.plan !== accountPlan.effectivePlan ? (
                <div className="rounded-[1rem] border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/5 dark:text-amber-100">
                  Your {formatPlanName(accountPlan.plan)} billing is {formatPlanStatus(accountPlan.planStatus)}; feature access follows{" "}
                  {formatPlanName(accountPlan.effectivePlan)} until paid access is active again.
                </div>
              ) : null}

              {accountPlan.effectivePlan !== accountPlan.quotaPlan ? (
                <div className="rounded-[1rem] border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-950 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-100">
                  Personal hosted quotas (pastes, storage, API keys, attachments) follow{" "}
                  <strong>{formatPlanName(accountPlan.quotaPlan)}</strong>. Premium features such as webhooks still follow{" "}
                  <strong>{formatPlanName(accountPlan.effectivePlan)}</strong>.
                </div>
              ) : null}

              <div className="space-y-4">
                {[
                  {
                    label: "Hosted pastes",
                    used: accountPlan.usage.pastes,
                    limit: accountPlan.limits.hostedPastes,
                    detail: `${formatCount(accountPlan.usage.pastes)} of ${formatCount(accountPlan.limits.hostedPastes)}`
                  },
                  {
                    label: "Storage",
                    used: accountPlan.usage.storageBytes,
                    limit: accountPlan.limits.storageBytes,
                    detail: `${formatBytes(accountPlan.usage.storageBytes)} of ${formatBytes(accountPlan.limits.storageBytes)}`
                  },
                  {
                    label: "API keys",
                    used: accountPlan.usage.apiKeys,
                    limit: accountPlan.limits.apiKeys,
                    detail: `${formatCount(accountPlan.usage.apiKeys)} of ${formatCount(accountPlan.limits.apiKeys)}`
                  }
                ].map((metric) => (
                  <div key={metric.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-foreground">{metric.label}</span>
                      <span className="text-muted-foreground">{metric.detail}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#f59e0b_0%,#f97316_40%,#fb7185_100%)]"
                        style={{ width: usageWidth(metric.used, metric.limit) }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="min-w-0 rounded-[1rem] border border-border bg-muted/40 p-4">
                  <p className="text-xs font-medium leading-snug text-muted-foreground text-balance">
                    Files per paste
                  </p>
                  <p className="mt-2 text-lg font-semibold tabular-nums">{formatCount(accountPlan.limits.filesPerPaste)}</p>
                </div>
                <div className="min-w-0 rounded-[1rem] border border-border bg-muted/40 p-4">
                  <p className="text-xs font-medium leading-snug text-muted-foreground text-balance">
                    Max paste size
                  </p>
                  <p className="mt-2 text-lg font-semibold tabular-nums">{formatBytes(accountPlan.limits.maxPasteBytes)}</p>
                </div>
                <div className="min-w-0 rounded-[1rem] border border-border bg-muted/40 p-4">
                  <p className="text-xs font-medium leading-snug text-muted-foreground text-balance">
                    Saved versions
                  </p>
                  <p className="mt-2 text-lg font-semibold tabular-nums">{formatCount(accountPlan.limits.versionHistory)}</p>
                </div>
              </div>

              <div className="rounded-[1rem] border border-border bg-muted/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">Premium capabilities</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Pro unlocks webhooks, higher API throughput, deeper history, and larger hosted limits.
                    </p>
                  </div>
                  <Badge
                    className={
                      accountPlan.features.webhooks
                        ? "border-emerald-600/30 bg-emerald-600/15 text-emerald-950 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100"
                        : "border-border bg-transparent text-muted-foreground"
                    }
                  >
                    {accountPlan.features.webhooks ? "Webhooks enabled" : "Webhooks on Pro"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Details</p>
                <h2 className="mt-2 text-xl font-semibold">Advanced settings</h2>
              </div>
              <Button
                aria-label="Hide details sidebar"
                className={cn("h-9 w-9 shrink-0", phoneViewport && "hidden")}
                onClick={() => setRightSidebarCollapsed(true)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            </div>

            {selectedPaste ? (
              <>
                {phoneViewport ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        className="mb-2 block text-xs uppercase tracking-[0.24em] text-muted-foreground"
                        htmlFor="wox-paste-language-select-mobile"
                      >
                        Language
                      </label>
                      <select
                        className="h-11 w-full rounded-2xl border border-border bg-card/80 px-4 text-sm"
                        disabled={!selectedPasteInWorkspace}
                        id="wox-paste-language-select-mobile"
                        onChange={(event) =>
                          updateSelectedPaste((paste) => ({
                            ...paste,
                            language: event.target.value,
                            updatedAt: new Date().toISOString()
                          }))
                        }
                        title="Paste language or format"
                        value={selectedPaste.language}
                      >
                        {LANGUAGES.map((language) => (
                          <option key={language} value={language}>
                            {language}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        className="mb-2 block text-xs uppercase tracking-[0.24em] text-muted-foreground"
                        htmlFor="wox-paste-folder-mobile"
                      >
                        Folder
                      </label>
                      {(() => {
                        const fv = selectedPaste.folder ?? "";
                        const folderSelectValue = fv
                          ? sortedWorkspaceFolders.includes(fv)
                            ? fv
                            : "__custom__"
                          : "__none__";
                        const iso = new Date().toISOString();
                        return (
                          <>
                            <select
                              className="h-11 w-full rounded-2xl border border-border bg-card/80 px-4 text-sm"
                              disabled={!selectedPasteInWorkspace}
                              id="wox-paste-folder-mobile"
                              onChange={(event) => {
                                const v = event.target.value;
                                if (v === "__none__") {
                                  setFolderDraftMode(false);
                                  updateSelectedPaste((paste) => ({
                                    ...paste,
                                    folder: null,
                                    updatedAt: iso
                                  }));
                                  return;
                                }
                                if (v === "__new__") {
                                  setFolderDraftMode(true);
                                  updateSelectedPaste((paste) => ({
                                    ...paste,
                                    folder: null,
                                    updatedAt: iso
                                  }));
                                  return;
                                }
                                if (v === "__custom__") {
                                  return;
                                }
                                setFolderDraftMode(false);
                                updateSelectedPaste((paste) => ({
                                  ...paste,
                                  folder: v,
                                  updatedAt: iso
                                }));
                              }}
                              title="Folder"
                              value={folderSelectValue}
                            >
                              <option value="__none__">No folder</option>
                              {sortedWorkspaceFolders.map((folder) => (
                                <option key={folder} value={folder}>
                                  {folder}
                                </option>
                              ))}
                              <option value="__new__">+ New folder…</option>
                              {folderSelectValue === "__custom__" && fv ? (
                                <option value="__custom__">{fv} (custom)</option>
                              ) : null}
                            </select>
                            {folderDraftMode || folderSelectValue === "__custom__" ? (
                              <Input
                                aria-label="Folder name"
                                className="mt-2"
                                disabled={!selectedPasteInWorkspace}
                                onBlur={() => {
                                  ensureFolderListed(selectedPaste.folder ?? null);
                                  setFolderDraftMode(false);
                                }}
                                onChange={(event) => {
                                  const raw = event.target.value;
                                  updateSelectedPaste((paste) => ({
                                    ...paste,
                                    folder: raw.trim() ? raw : null,
                                    updatedAt: new Date().toISOString()
                                  }));
                                }}
                                placeholder="Folder name"
                                value={selectedPaste.folder ?? ""}
                              />
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ) : null}

                <div>
                  <label
                    className="mb-2 block text-xs uppercase tracking-[0.24em] text-muted-foreground"
                    htmlFor="wox-paste-visibility"
                  >
                    Visibility
                  </label>
                  <select
                    className="h-11 w-full rounded-2xl border border-border bg-card/80 px-4 text-sm"
                    disabled={!selectedPasteInWorkspace || selectedPaste.secretMode}
                    id="wox-paste-visibility"
                    title="Who can see this paste"
                    onChange={(event) =>
                      updateSelectedPaste((paste) => ({
                        ...paste,
                        visibility: paste.secretMode ? "unlisted" : (event.target.value as PasteDraft["visibility"]),
                        updatedAt: new Date().toISOString()
                      }))
                    }
                    value={selectedPaste.visibility}
                  >
                    {VISIBILITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {selectedPaste.secretMode ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Secret links always save as unlisted and stay out of archive, feed, comments, and stars.
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    className="mb-2 block text-xs uppercase tracking-[0.24em] text-muted-foreground"
                    htmlFor="wox-paste-custom-url"
                  >
                    Custom URL
                  </label>
                  <Input
                    disabled={!selectedPasteInWorkspace || customSlugReadOnly}
                    id="wox-paste-custom-url"
                    onChange={(event) =>
                      updateSelectedPaste((paste) => ({
                        ...paste,
                        slug: normalizeOptionalSlug(event.target.value),
                        updatedAt: new Date().toISOString()
                      }))
                    }
                    placeholder="Leave blank to auto-generate from title"
                    value={selectedPaste.slug || ""}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {selectedPaste.slug
                      ? `Share path: ${getPasteSharePath(selectedPaste.slug, selectedPaste.secretMode)}`
                      : "Leave this blank to generate the URL from the title when you save or publish."}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mode !== "account"
                      ? "Custom URLs only apply to hosted account saves."
                      : canEditCustomSlug
                        ? "If the path is already taken, save returns a conflict so you can pick another one."
                        : "Custom URLs are limited to Pro and Team accounts. Free saves still get an automatic share path."}
                  </p>
                </div>

                <div>
                  <label
                    className="mb-2 block text-xs uppercase tracking-[0.24em] text-muted-foreground"
                    htmlFor="wox-paste-category"
                  >
                    Category
                  </label>
                  <select
                    className="h-11 w-full rounded-2xl border border-border bg-card/80 px-4 text-sm"
                    disabled={!selectedPasteInWorkspace}
                    id="wox-paste-category"
                    title="Paste category"
                    onChange={(event) =>
                      updateSelectedPaste((paste) => ({
                        ...paste,
                        category: event.target.value || null,
                        updatedAt: new Date().toISOString()
                      }))
                    }
                    value={selectedPaste.category || ""}
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category || "none"} value={category}>
                        {category || "No category"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    Tags
                  </label>
                  <Input
                    disabled={!selectedPasteInWorkspace}
                    onChange={(event) =>
                      updateSelectedPaste((paste) => ({
                        ...paste,
                        tags: normalizeTagList(event.target.value),
                        updatedAt: new Date().toISOString()
                      }))
                    }
                    placeholder="tag-one, tag-two"
                    value={selectedPaste.tags.join(", ")}
                  />
                </div>

                {selectedPasteLineageDisplay &&
                (selectedPasteLineageDisplay.forkedFrom ||
                  selectedPasteLineageDisplay.replyTo ||
                  selectedPaste.forkedFromId ||
                  selectedPaste.replyToId) ? (
                  <div className="space-y-2">
                    <label className="mb-1 block text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Lineage
                    </label>
                    <PasteLineageBanner
                      forkedFrom={selectedPasteLineageDisplay.forkedFrom}
                      plain={mode === "local"}
                      replyTo={selectedPasteLineageDisplay.replyTo}
                    />
                    {selectedPaste.forkedFromId || selectedPaste.replyToId ? (
                      <Button
                        className="w-full"
                        disabled={!selectedPasteInWorkspace}
                        onClick={() =>
                          updateSelectedPaste((p) => ({
                            ...p,
                            forkedFromId: null,
                            replyToId: null,
                            forkedFrom: null,
                            replyTo: null,
                            updatedAt: new Date().toISOString()
                          }))
                        }
                        type="button"
                        variant="ghost"
                      >
                        Clear fork / reply metadata
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-[1.2rem] border border-border bg-muted/40 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Created</p>
                    <p className="mt-2 font-medium text-foreground">{formatDate(selectedPaste.createdAt)}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-border bg-muted/40 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Updated</p>
                    <p className="mt-2 font-medium text-foreground">{formatDate(selectedPaste.updatedAt)}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-border bg-muted/40 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Views</p>
                    <p className="mt-2 font-medium text-foreground">
                      {selectedPaste.viewCount.toLocaleString()} view{selectedPaste.viewCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] border border-border bg-muted/40 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Engagement</p>
                    <p className="mt-2 font-medium text-foreground">
                      {(selectedPaste.commentsCount ?? 0).toLocaleString()} comments · {(selectedPaste.stars ?? 0).toLocaleString()} stars
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    Password
                  </label>
                  <Input
                    disabled={!selectedPasteInWorkspace}
                    onChange={(event) =>
                      updateSelectedPaste((paste) => ({
                        ...paste,
                        password: event.target.value || null,
                        updatedAt: new Date().toISOString()
                      }))
                    }
                    placeholder="Optional paste password"
                    type="password"
                    value={selectedPaste.password || ""}
                  />
                </div>

                {/* Full-width column: sidebar is ~360px; multi-column grids squish labels */}
                <div className="flex flex-col gap-3">
                  <label className="flex w-full cursor-pointer items-center gap-3 rounded-[1.2rem] border border-border bg-muted/40 px-4 py-3 text-sm">
                    <input
                      checked={selectedPaste.secretMode}
                      className="size-4 shrink-0 rounded border border-input accent-primary"
                      disabled={!selectedPasteInWorkspace}
                      onChange={(event) =>
                        updateSelectedPaste((paste) => ({
                          ...paste,
                          secretMode: event.target.checked,
                          visibility: event.target.checked ? "unlisted" : paste.visibility,
                          burnAfterRead: event.target.checked ? true : paste.burnAfterRead,
                          updatedAt: new Date().toISOString()
                        }))
                      }
                      type="checkbox"
                    />
                    <span className="min-w-0 leading-snug">
                      Secret link mode
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Uses a dedicated <code className="rounded bg-background/70 px-1">/s/</code> URL, hides community features, and defaults to burn after read. This is still server-stored sharing, not client-side encrypted fragment sharing.
                        </span>
                    </span>
                  </label>
                  <label className="flex w-full cursor-pointer items-center gap-3 rounded-[1.2rem] border border-border bg-muted/40 px-4 py-3 text-sm">
                    <input
                      checked={selectedPaste.captchaRequired}
                      className="size-4 shrink-0 rounded border border-input accent-primary"
                      disabled={!selectedPasteInWorkspace || selectedPaste.visibility === "private"}
                      onChange={(event) =>
                        updateSelectedPaste((paste) => ({
                          ...paste,
                          captchaRequired: paste.visibility === "private" ? false : event.target.checked,
                          updatedAt: new Date().toISOString()
                        }))
                      }
                      type="checkbox"
                    />
                    <span className="min-w-0 leading-snug">
                      Require Turnstile challenge before viewing
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Applies to public and unlisted pastes. Private pastes ignore this setting.
                      </span>
                    </span>
                  </label>
                  <label className="flex w-full cursor-pointer items-center gap-3 rounded-[1.2rem] border border-border bg-muted/40 px-4 py-3 text-sm">
                    <input
                      checked={selectedPaste.burnAfterRead}
                      className="size-4 shrink-0 rounded border border-input accent-primary"
                      disabled={!selectedPasteInWorkspace}
                      onChange={(event) =>
                        updateSelectedPaste((paste) => ({
                          ...paste,
                          burnAfterRead: event.target.checked,
                          updatedAt: new Date().toISOString()
                        }))
                      }
                      type="checkbox"
                    />
                    <span className="min-w-0 leading-snug">Burn after read</span>
                  </label>
                  <label className="flex w-full cursor-pointer items-center gap-3 rounded-[1.2rem] border border-border bg-muted/40 px-4 py-3 text-sm">
                    <input
                      checked={selectedPaste.pinned}
                      className="size-4 shrink-0 rounded border border-input accent-primary"
                      disabled={!selectedPasteInWorkspace}
                      onChange={(event) =>
                        updateSelectedPaste((paste) => ({
                          ...paste,
                          pinned: event.target.checked,
                          updatedAt: new Date().toISOString()
                        }))
                      }
                      type="checkbox"
                    />
                    <span className="min-w-0 leading-snug">Pin paste</span>
                  </label>
                  <label className="flex w-full cursor-pointer items-center gap-3 rounded-[1.2rem] border border-border bg-muted/40 px-4 py-3 text-sm">
                    <input
                      checked={selectedPaste.favorite}
                      className="size-4 shrink-0 rounded border border-input accent-primary"
                      disabled={!selectedPasteInWorkspace}
                      onChange={(event) =>
                        updateSelectedPaste((paste) => ({
                          ...paste,
                          favorite: event.target.checked,
                          updatedAt: new Date().toISOString()
                        }))
                      }
                      type="checkbox"
                    />
                    <span className="min-w-0 leading-snug">Favorite</span>
                  </label>
                  <label className="flex w-full cursor-pointer items-center gap-3 rounded-[1.2rem] border border-border bg-muted/40 px-4 py-3 text-sm">
                    <input
                      checked={selectedPaste.archived}
                      className="size-4 shrink-0 rounded border border-input accent-primary"
                      disabled={!selectedPasteInWorkspace}
                      onChange={(event) =>
                        updateSelectedPaste((paste) => ({
                          ...paste,
                          archived: event.target.checked,
                          updatedAt: new Date().toISOString()
                        }))
                      }
                      type="checkbox"
                    />
                    <span className="min-w-0 leading-snug">Archived</span>
                  </label>
                  <label className="flex w-full cursor-pointer items-center gap-3 rounded-[1.2rem] border border-border bg-muted/40 px-4 py-3 text-sm">
                    <input
                      checked={selectedPaste.template}
                      className="size-4 shrink-0 rounded border border-input accent-primary"
                      disabled={!selectedPasteInWorkspace}
                      onChange={(event) =>
                        updateSelectedPaste((paste) => ({
                          ...paste,
                          template: event.target.checked,
                          updatedAt: new Date().toISOString()
                        }))
                      }
                      type="checkbox"
                    />
                    <span className="min-w-0 leading-snug">Save as template</span>
                  </label>
                </div>

                <div>
                  <label
                    className="mb-2 block text-xs uppercase tracking-[0.24em] text-muted-foreground"
                    htmlFor="wox-paste-burn-after-views"
                  >
                    Burn after views
                  </label>
                  <select
                    className="h-11 w-full rounded-2xl border border-border bg-card/80 px-4 text-sm"
                    disabled={!selectedPasteInWorkspace}
                    id="wox-paste-burn-after-views"
                    title="Delete paste after this many views"
                    onChange={(event) =>
                      updateSelectedPaste((paste) => ({
                        ...paste,
                        burnAfterViews: Number(event.target.value),
                        updatedAt: new Date().toISOString()
                      }))
                    }
                    value={String(selectedPaste.burnAfterViews)}
                  >
                    {BURN_VIEW_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value === 0 ? "Disabled" : `${value} view${value === 1 ? "" : "s"}`}
                      </option>
                    ))}
                  </select>
                </div>

                <Separator />

                <div className="space-y-4 rounded-[1.25rem] border border-border bg-muted/40 p-4">
                  <div>
                    <p className="font-medium text-foreground">Sharing</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedPaste.secretMode
                        ? "Secret links use a dedicated /s URL and stay out of archive, feed, comments, and stars."
                        : mode === "account"
                          ? "Public and unlisted pastes get a stable share URL after save."
                          : "Anonymous publish keeps drafts local and sends a shareable copy to the hosted backend."}
                    </p>
                  </div>

                  {mode === "account" ? (
                    isAccountOnlyDraft(selectedPaste, mode) ? (
                      <p className="text-sm text-muted-foreground">
                        Save this paste once to create it on your account; then you can copy share links.
                      </p>
                    ) : selectedPaste.visibility !== "private" ? (
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => void copyPublicLink()} type="button" variant="outline">
                          <Share2 className="h-4 w-4" />
                          Copy share link
                        </Button>
                        <Button
                          disabled={!selectedPasteInWorkspace}
                          onClick={() => setShareBuilderOpen(true)}
                          type="button"
                          variant="outline"
                        >
                          Share builder
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Set visibility to public or unlisted, then save, to share this paste.
                      </p>
                    )
                  ) : (
                    <>
                      <TurnstileField siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
                      <Button
                        disabled={publishing || !selectedPasteInWorkspace}
                        onClick={() => void handleAnonymousPublish()}
                        type="button"
                      >
                        <Cloud className="h-4 w-4" />
                        {publishing ? "Publishing..." : "Publish anonymously"}
                      </Button>
                      {publishUrl ? (
                        <div className="rounded-[1rem] border border-emerald-600/25 bg-emerald-600/10 p-3 text-sm text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-400/5 dark:text-emerald-100">
                          <p className="font-medium">Share URL</p>
                          <p className="mt-2 break-all font-mono text-xs">{publishUrl}</p>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Versions</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Saved versions are created automatically when account-backed pastes change materially.
                      {mode === "account" && accountPlan
                        ? ` This plan retains up to ${formatCount(accountPlan.limits.versionHistory)} versions per paste.`
                        : ""}
                    </p>
                  </div>
                  {selectedPaste.versions.length === 0 ? (
                    <div className="rounded-[1rem] border border-dashed border-border bg-muted/50 p-3 text-sm text-muted-foreground dark:bg-black/10">
                      No saved versions yet.
                    </div>
                  ) : (
                    selectedPaste.versions.map((version) => (
                      <div key={version.id} className="rounded-[1rem] border border-border bg-muted/40 p-4">
                        <p className="font-medium text-foreground">{version.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(version.createdAt)} • {version.files.length} files
                        </p>
                        <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                          {version.content}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            disabled={!selectedPasteInWorkspace}
                            onClick={() => setDiffVersion(version)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <GitCompare className="h-4 w-4" />
                            Diff vs current
                          </Button>
                          <Button
                            disabled={!selectedPasteInWorkspace}
                            onClick={() => restorePasteVersion(version)}
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            Restore into editor
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a paste to configure its details.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">History</p>
              <h2 className="mt-2 text-xl font-semibold">Recently viewed</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Shared pastes you open are stored in this browser, so signed-in and anonymous visits can pick up where
                they left off.
              </p>
            </div>
            {viewHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No viewed pastes yet. Open any shared paste and it will appear here.</p>
            ) : (
              <div className="space-y-3">
                {viewHistory.slice(0, 8).map((entry) => (
                  <div key={entry.slug} className="rounded-[1rem] border border-border bg-muted/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{entry.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Viewed {formatDate(entry.viewedAt)}
                          {entry.authorLabel ? ` • ${entry.authorLabel}` : ""}
                        </p>
                      </div>
                      <Badge className="shrink-0 border-border bg-transparent text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        {entry.secretMode ? "Secret" : entry.visibility}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button asChild size="sm" type="button" variant="outline">
                        <Link href={entry.path}>
                          <ExternalLink className="h-4 w-4" />
                          Open paste
                        </Link>
                      </Button>
                      <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
                        {entry.language || "none"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {viewHistory.length > 0 ? (
              <Button
                onClick={() => {
                  clearPasteViewHistory();
                  setStatus("Cleared local paste history.");
                }}
                type="button"
                variant="ghost"
              >
                <Eraser className="h-4 w-4" />
                Clear local history
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {sessionUser && mode === "account" ? (
          <Card>
            <CardContent className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Developer</p>
                <h2 className="mt-2 text-xl font-semibold">API keys</h2>
                {accountPlan ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatCount(accountPlan.usage.apiKeys)} of {formatCount(accountPlan.limits.apiKeys)} keys in use
                    (quota: {formatPlanName(accountPlan.quotaPlan)}). You can keep multiple keys active at once within
                    your plan limit.
                  </p>
                ) : null}
              </div>
              <div className="space-y-3">
                <Input
                  onChange={(event) => setApiKeyLabel(event.target.value)}
                  placeholder="Key label"
                  value={apiKeyLabel}
                />
                <Button
                  disabled={Boolean(accountPlan && accountPlan.usage.apiKeys >= accountPlan.limits.apiKeys)}
                  onClick={() => void handleCreateApiKey()}
                  type="button"
                  variant="outline"
                >
                  <KeyRound className="h-4 w-4" />
                  Create API key
                </Button>
              </div>
              <div className="space-y-3">
                {apiKeys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No API keys yet.</p>
                ) : (
                  apiKeys.map((key) => (
                    <div key={key.id} className="rounded-[1rem] border border-border bg-muted/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{key.label}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Created {formatDate(key.createdAt)}
                            {key.lastUsedAt ? ` • Last used ${formatDate(key.lastUsedAt)}` : ""}
                          </p>
                        </div>
                        <Button onClick={() => void handleRevokeApiKey(key.id)} size="sm" type="button" variant="ghost">
                          Revoke
                        </Button>
                      </div>
                      <div className="mt-3 rounded-[1rem] border border-border/80 bg-background/55 p-3">
                        {key.token ? (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium text-foreground">Stored on this browser</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  onClick={() => toggleApiKeyReveal(key.id)}
                                  size="sm"
                                  type="button"
                                  variant="ghost"
                                >
                                  {revealedApiKeyIds.has(key.id) ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                  {revealedApiKeyIds.has(key.id) ? "Hide" : "Show"}
                                </Button>
                                <Button
                                  onClick={() => void handleCopyApiKeyToken(key.token ?? "")}
                                  size="sm"
                                  type="button"
                                  variant="secondary"
                                >
                                  <Copy className="h-4 w-4" />
                                  Copy
                                </Button>
                              </div>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              This browser has a saved copy of the plaintext token for this key.
                            </p>
                            <div className="mt-3 min-w-0 break-all rounded-xl border border-border bg-muted/60 px-3 py-2 font-mono text-xs text-foreground">
                              {revealedApiKeyIds.has(key.id) ? key.token : "\u2022".repeat(24)}
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-foreground">Token unavailable here</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              WOX-Bin stores API keys as hashes on the server, so this browser cannot reveal older
                              plaintext tokens it never created or saved. Create a replacement key if you need to copy
                              it again.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  return (
    <main
      className={cn(
        "wox-workspace-root workspace-full flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-col gap-1.5 overflow-hidden px-2 py-1.5 motion-safe:animate-wox-fade-in md:gap-3 md:px-4 md:py-3",
        workspaceTone === "deep" && "workspace-tone-deep",
        workspaceTone === "warm" && "workspace-tone-warm",
        workspaceTone === "forest" && "workspace-tone-forest"
      )}
    >
      <div className="flex min-h-0 w-full flex-1 flex-col gap-1.5 md:gap-3" style={workspaceViewportStyle}>
      <header className="glass-panel z-40 shrink-0 border-b border-border px-3 py-1.5 print:hidden sm:px-4 sm:py-2">
        <div className="flex items-center justify-between gap-2 md:hidden">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              className="min-w-0 shrink text-sm font-semibold tracking-tight text-foreground"
              href="/app"
              title={
                mode === "account"
                  ? "Account sync, public sharing, and launch-ready controls."
                  : "Local-first drafting, fast capture, and portable exports."
              }
            >
              WOX-Bin
              <span className="font-normal text-muted-foreground"> workspace</span>
            </Link>
            {sessionUser ? (
              <>
                <Badge
                  className={cn(
                    "shrink-0 px-2 py-0 text-[10px] font-medium normal-case tracking-normal",
                    displayedPlan === "free"
                      ? "border-border bg-transparent"
                      : "border-amber-500/35 bg-amber-500/15 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"
                  )}
                >
                  {formatPlanName(displayedPlan)} plan
                </Badge>
                {displayedPlanStatus !== "active" ? (
                  <Badge className="shrink-0 border-border bg-transparent px-2 py-0 text-[10px] capitalize text-muted-foreground">
                    {formatPlanStatus(displayedPlanStatus)}
                  </Badge>
                ) : null}
              </>
            ) : null}
          </div>
          <Button
            aria-controls="wox-workspace-mobile-nav"
            aria-expanded={workspaceMobileMenuOpen}
            aria-label={workspaceMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="h-10 w-10 shrink-0 touch-manipulation"
            onClick={() => setWorkspaceMobileMenuOpen((open) => !open)}
            size="icon"
            type="button"
            variant="outline"
          >
            {workspaceMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <div
          className={cn(
            "border-border pb-1 pt-2 md:hidden",
            workspaceMobileMenuOpen ? "block border-t" : "hidden"
          )}
          id="wox-workspace-mobile-nav"
        >
          <nav aria-label="Site" className="flex flex-col gap-0.5">
            <Link
              className={workspaceMobileNavClass(pathname === "/")}
              href="/"
              onClick={() => setWorkspaceMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              className={workspaceMobileNavClass(pathname === "/feed")}
              href="/feed"
              onClick={() => setWorkspaceMobileMenuOpen(false)}
            >
              Feed
            </Link>
            <Link
              className={workspaceMobileNavClass(pathname === "/archive")}
              href="/archive"
              onClick={() => setWorkspaceMobileMenuOpen(false)}
            >
              Archive
            </Link>
            <Link
              className={workspaceMobileNavClass(Boolean(pathname?.startsWith("/app")))}
              href="/app"
              onClick={() => setWorkspaceMobileMenuOpen(false)}
            >
              Workspace
            </Link>
            <Link
              className={workspaceMobileNavClass(pathname === "/help")}
              href="/help"
              onClick={() => setWorkspaceMobileMenuOpen(false)}
            >
              Help
            </Link>
            <Link
              className={workspaceMobileNavClass(Boolean(pathname?.startsWith("/support")))}
              href="/support"
              onClick={() => setWorkspaceMobileMenuOpen(false)}
            >
              Support
            </Link>
            {sessionUser ? (
              <Link
                className={workspaceMobileNavClass(Boolean(pathname?.startsWith("/settings")))}
                href="/settings/account"
                onClick={() => setWorkspaceMobileMenuOpen(false)}
              >
                Settings
              </Link>
            ) : null}
          </nav>
          <WorkspaceHeaderAppearance
            appHighContrast={appHighContrast}
            className="mt-3"
            onSyntaxThemeChange={setSyntaxTheme}
            onToggleHighContrast={() => setAppHighContrast((v) => !v)}
            onUiThemeChange={setUiTheme}
            onWorkspaceToneChange={setWorkspaceTone}
            stacked
            syntaxTheme={syntaxTheme}
            uiTheme={uiTheme}
            workspaceTone={workspaceTone}
          />
          <div className="mt-3 rounded-[1.1rem] border border-border bg-muted/35 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Workspace zoom</p>
              <button
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() => setPageZoom(DEFAULT_WORKSPACE_ZOOM)}
                type="button"
              >
                Reset
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="h-9 w-9 shrink-0"
                disabled={pageZoom <= MIN_WORKSPACE_ZOOM}
                onClick={() => changePageZoom(-WORKSPACE_ZOOM_STEP)}
                size="icon"
                type="button"
                variant="outline"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1 rounded-full border border-border bg-background/60 px-3 py-2 text-center text-sm font-medium tabular-nums">
                {pageZoom}%
              </div>
              <Button
                className="h-9 w-9 shrink-0"
                disabled={pageZoom >= MAX_WORKSPACE_ZOOM}
                onClick={() => changePageZoom(WORKSPACE_ZOOM_STEP)}
                size="icon"
                type="button"
                variant="outline"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {sessionUser ? (
              <>
                <div className="flex min-w-0 flex-1 rounded-full border border-border bg-muted/50 p-0.5">
                  <Button
                    className="h-10 min-h-11 flex-1 rounded-full px-3 text-xs"
                    onClick={() => {
                      void switchMode("account");
                      setWorkspaceMobileMenuOpen(false);
                    }}
                    size="sm"
                    title="Account sync (hosted)"
                    type="button"
                    variant={mode === "account" ? "default" : "ghost"}
                  >
                    <Cloud className="mr-1 h-4 w-4 shrink-0" />
                    Account
                  </Button>
                  <Button
                    className="h-10 min-h-11 flex-1 rounded-full px-3 text-xs"
                    onClick={() => {
                      void switchMode("local");
                      setWorkspaceMobileMenuOpen(false);
                    }}
                    size="sm"
                    title="Local drafts (device)"
                    type="button"
                    variant={mode === "local" ? "default" : "ghost"}
                  >
                    <FolderTree className="mr-1 h-4 w-4 shrink-0" />
                    Local
                  </Button>
                </div>
                <Button
                  className="h-10 min-h-11 px-3 text-sm"
                  onClick={() => {
                    setWorkspaceMobileMenuOpen(false);
                    openTutorial(0);
                  }}
                  type="button"
                  variant="outline"
                >
                  <WandSparkles className="mr-1 h-4 w-4" />
                  Tutorial
                </Button>
                {sessionUser.role === "admin" ? (
                  <Button asChild className="h-10 min-h-11 px-3 text-sm" type="button" variant="outline">
                    <Link className="inline-flex items-center gap-1.5" href="/admin" onClick={() => setWorkspaceMobileMenuOpen(false)}>
                      <Shield className="h-4 w-4" />
                      Admin
                    </Link>
                  </Button>
                ) : null}
                <Button
                  className="h-10 min-h-11 px-3 text-sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  type="button"
                  variant="outline"
                >
                  <LogOut className="mr-1 h-4 w-4" />
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="h-10 min-h-11 flex-1 text-sm"
                  onClick={() => {
                    setWorkspaceMobileMenuOpen(false);
                    openTutorial(0);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <WandSparkles className="mr-1 h-4 w-4" />
                  Tutorial
                </Button>
                <Button
                  asChild
                  className="h-10 min-h-11 flex-1 text-sm"
                  size="sm"
                  variant="outline"
                >
                  <Link href="/sign-in" onClick={() => setWorkspaceMobileMenuOpen(false)}>
                    Sign in
                  </Link>
                </Button>
                <Button asChild className="h-10 min-h-11 flex-1 text-sm" size="sm">
                  <Link href="/sign-up" onClick={() => setWorkspaceMobileMenuOpen(false)}>
                    Sign up
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {!phoneViewport ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
          {sessionUser ? (
            <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
                <div className="flex flex-1 rounded-full border border-border bg-muted/50 p-0.5 min-[400px]:flex-initial">
                  <Button
                    className="h-10 min-h-11 flex-1 rounded-full px-3 text-xs min-[400px]:flex-initial sm:text-sm"
                    onClick={() => void switchMode("account")}
                    size="sm"
                    title="Account sync (hosted)"
                    type="button"
                    variant={mode === "account" ? "default" : "ghost"}
                  >
                    <Cloud className="mr-1 h-4 w-4 shrink-0" />
                    Account
                  </Button>
                  <Button
                    className="h-10 min-h-11 flex-1 rounded-full px-3 text-xs min-[400px]:flex-initial sm:text-sm"
                    onClick={() => void switchMode("local")}
                    size="sm"
                    title="Local drafts (device)"
                    type="button"
                    variant={mode === "local" ? "default" : "ghost"}
                  >
                    <FolderTree className="mr-1 h-4 w-4 shrink-0" />
                    Local
                  </Button>
                </div>
                <Button
                  className="h-10 min-h-11 px-3 text-sm"
                  onClick={() => openTutorial(0)}
                  type="button"
                  variant="outline"
                >
                  <WandSparkles className="mr-1 h-4 w-4" />
                  Tutorial
                </Button>
                {sessionUser.role === "admin" ? (
                  <Button asChild className="h-10 min-h-11 px-3 text-sm" type="button" variant="outline">
                    <Link className="inline-flex items-center gap-1.5" href="/admin">
                      <Shield className="h-4 w-4" />
                      Admin
                    </Link>
                  </Button>
                ) : null}
                <Button
                  className="h-10 min-h-11 px-3 text-sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  type="button"
                  variant="outline"
                >
                  <LogOut className="mr-1 h-4 w-4" />
                  Sign out
                </Button>
            </div>
          ) : (
            <div className="flex w-full flex-wrap gap-2">
              <Button className="h-10 min-h-11 flex-1 text-sm sm:flex-initial" onClick={() => openTutorial(0)} size="sm" type="button" variant="outline">
                <WandSparkles className="mr-1 h-4 w-4" />
                Tutorial
              </Button>
              <Button asChild className="h-10 min-h-11 flex-1 text-sm sm:flex-initial" size="sm" variant="outline">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild className="h-10 min-h-11 flex-1 text-sm sm:flex-initial" size="sm">
                <Link href="/sign-up">Sign up</Link>
              </Button>
            </div>
          )}
          </div>
        ) : null}

        <div className="mt-2 hidden flex-col gap-2 md:mt-0 md:flex md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-3 md:gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 sm:gap-x-3">
            <Link
              className="shrink-0 text-sm font-semibold tracking-tight text-foreground"
              href="/app"
              title={
                mode === "account"
                  ? "Account sync, public sharing, and launch-ready controls."
                  : "Local-first drafting, fast capture, and portable exports."
              }
            >
              WOX-Bin
              <span className="font-normal text-muted-foreground"> workspace</span>
            </Link>
            {sessionUser ? (
              <>
                <Badge
                  className={cn(
                    "shrink-0 px-2 py-0 text-[10px] font-medium normal-case tracking-normal",
                    displayedPlan === "free"
                      ? "border-border bg-transparent"
                      : "border-amber-500/35 bg-amber-500/15 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"
                  )}
                >
                  {formatPlanName(displayedPlan)} plan
                </Badge>
                {displayedPlanStatus !== "active" ? (
                  <Badge className="shrink-0 border-border bg-transparent px-2 py-0 text-[10px] capitalize text-muted-foreground">
                    {formatPlanStatus(displayedPlanStatus)}
                  </Badge>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
            <nav aria-label="Site" className="flex flex-wrap items-center gap-0.5 sm:gap-1" data-tutorial="workspace-nav">
              <Link className={workspaceHeaderNavClass(pathname === "/")} href="/">
                Home
              </Link>
              <Link className={workspaceHeaderNavClass(pathname === "/feed")} href="/feed">
                Feed
              </Link>
              <Link className={workspaceHeaderNavClass(pathname === "/archive")} href="/archive">
                Archive
              </Link>
              <Link
                className={workspaceHeaderNavClass(Boolean(pathname?.startsWith("/app")))}
                href="/app"
              >
                Workspace
              </Link>
              <Link className={workspaceHeaderNavClass(pathname === "/help")} href="/help">
                Help
              </Link>
              <Link
                className={workspaceHeaderNavClass(Boolean(pathname?.startsWith("/support")))}
                href="/support"
              >
                Support
              </Link>
              {sessionUser ? (
                <Link
                  className={workspaceHeaderNavClass(Boolean(pathname?.startsWith("/settings")))}
                  href="/settings/account"
                >
                  Settings
                </Link>
              ) : null}
            </nav>
            <WorkspaceHeaderAppearance
              appHighContrast={appHighContrast}
              onSyntaxThemeChange={setSyntaxTheme}
              onToggleHighContrast={() => setAppHighContrast((v) => !v)}
              onUiThemeChange={setUiTheme}
              onWorkspaceToneChange={setWorkspaceTone}
              syntaxTheme={syntaxTheme}
              uiTheme={uiTheme}
              workspaceTone={workspaceTone}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            {sessionUser ? (
              <>
                <div className="rounded-full border border-border bg-muted/50 p-0.5">
                  <Button
                    className="h-8 rounded-full px-2.5 text-xs sm:px-3 sm:text-sm"
                    onClick={() => void switchMode("account")}
                    size="sm"
                    title="Account sync (hosted)"
                    type="button"
                    variant={mode === "account" ? "default" : "ghost"}
                  >
                    <Cloud className="h-3.5 w-3.5 sm:mr-1 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Account</span>
                  </Button>
                  <Button
                    className="h-8 rounded-full px-2.5 text-xs sm:px-3 sm:text-sm"
                    onClick={() => void switchMode("local")}
                    size="sm"
                    title="Local drafts (device)"
                    type="button"
                    variant={mode === "local" ? "default" : "ghost"}
                  >
                    <FolderTree className="h-3.5 w-3.5 sm:mr-1 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Local</span>
                  </Button>
                </div>
                <Button className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm" onClick={() => openTutorial(0)} type="button" variant="outline">
                  <WandSparkles className="h-3.5 w-3.5 sm:mr-1 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Tutorial</span>
                </Button>
                <div className="flex items-center gap-1 rounded-full border border-border bg-muted/40 p-0.5">
                  <Button
                    className="h-8 w-8 rounded-full px-0"
                    disabled={pageZoom <= MIN_WORKSPACE_ZOOM}
                    onClick={() => changePageZoom(-WORKSPACE_ZOOM_STEP)}
                    size="icon"
                    title="Zoom out"
                    type="button"
                    variant="ghost"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <button
                    className="min-w-[3.35rem] rounded-full px-2 py-1 text-center text-xs font-medium tabular-nums text-foreground"
                    onClick={() => setPageZoom(DEFAULT_WORKSPACE_ZOOM)}
                    title="Reset zoom"
                    type="button"
                  >
                    {pageZoom}%
                  </button>
                  <Button
                    className="h-8 w-8 rounded-full px-0"
                    disabled={pageZoom >= MAX_WORKSPACE_ZOOM}
                    onClick={() => changePageZoom(WORKSPACE_ZOOM_STEP)}
                    size="icon"
                    title="Zoom in"
                    type="button"
                    variant="ghost"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {sessionUser.role === "admin" ? (
                  <Button asChild className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm" type="button" variant="outline">
                    <Link className="inline-flex items-center gap-1.5" href="/admin">
                      <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Admin
                    </Link>
                  </Button>
                ) : null}
                <Button
                  className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  type="button"
                  variant="outline"
                >
                  <LogOut className="h-3.5 w-3.5 sm:mr-1 sm:h-4 sm:w-4" />
                  Sign out
                </Button>
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1 rounded-full border border-border bg-muted/40 p-0.5">
                  <Button
                    className="h-8 w-8 rounded-full px-0"
                    disabled={pageZoom <= MIN_WORKSPACE_ZOOM}
                    onClick={() => changePageZoom(-WORKSPACE_ZOOM_STEP)}
                    size="icon"
                    title="Zoom out"
                    type="button"
                    variant="ghost"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <button
                    className="min-w-[3.35rem] rounded-full px-2 py-1 text-center text-xs font-medium tabular-nums text-foreground"
                    onClick={() => setPageZoom(DEFAULT_WORKSPACE_ZOOM)}
                    title="Reset zoom"
                    type="button"
                  >
                    {pageZoom}%
                  </button>
                  <Button
                    className="h-8 w-8 rounded-full px-0"
                    disabled={pageZoom >= MAX_WORKSPACE_ZOOM}
                    onClick={() => changePageZoom(WORKSPACE_ZOOM_STEP)}
                    size="icon"
                    title="Zoom in"
                    type="button"
                    variant="ghost"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button className="h-8 text-xs sm:h-9 sm:text-sm" onClick={() => openTutorial(0)} size="sm" type="button" variant="outline">
                  <WandSparkles className="h-3.5 w-3.5 sm:mr-1 sm:h-4 sm:w-4" />
                  Tutorial
                </Button>
                <Button asChild className="h-8 text-xs sm:h-9 sm:text-sm" size="sm" variant="outline">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild className="h-8 text-xs sm:h-9 sm:text-sm" size="sm">
                  <Link href="/sign-up">Sign up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden print:overflow-visible">
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-auto overscroll-y-contain print:overflow-visible workspace-scrollbar-hide md:gap-3",
            selectedPaste && phoneViewport
              ? "pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
              : selectedPaste
                ? "max-md:pb-[calc(5.25rem+env(safe-area-inset-bottom))]"
                : null
          )}
        >
      {localImportCount > 0 && sessionUser && mode === "account" ? (
        <Card className="shrink-0 border-cyan-600/25 bg-cyan-600/10 print:hidden dark:border-cyan-400/20 dark:bg-cyan-400/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Local drafts are ready to merge</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Found {localImportCount} local draft{localImportCount === 1 ? "" : "s"} in IndexedDB. Import them into your account when you are ready.
              </p>
            </div>
            <Button disabled={saving} onClick={() => void handleMergeLocalIntoAccount()} type="button">
              <Upload className="h-4 w-4" />
              Import local drafts
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {status ? (
        <div
          aria-live="polite"
          className="flex shrink-0 items-start gap-2 rounded-2xl border border-emerald-600/25 bg-emerald-600/10 px-3 py-2.5 text-sm text-emerald-950 print:hidden dark:border-emerald-400/20 dark:bg-emerald-400/5 dark:text-emerald-100 sm:px-4 sm:py-3"
          role="status"
        >
          <p className="min-w-0 flex-1 leading-snug">{status}</p>
          <Button
            aria-label="Dismiss message"
            className="h-7 w-7 shrink-0 text-emerald-900 hover:bg-emerald-600/20 dark:text-emerald-100 dark:hover:bg-emerald-400/15"
            onClick={() => setStatus(null)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {error ? (
        <div
          aria-live="assertive"
          className="flex shrink-0 items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive print:hidden dark:text-destructive-foreground sm:px-4 sm:py-3"
          role="alert"
        >
          <p className="min-w-0 flex-1 leading-snug">{error}</p>
          <Button
            aria-label="Dismiss error"
            className="h-7 w-7 shrink-0 hover:bg-destructive/15"
            onClick={() => setError(null)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col gap-1.5 print:block print:min-h-0 max-lg:gap-1.5 lg:flex-row lg:gap-4">
        {phoneViewport ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col print:w-full print:max-w-none">
            <div className="mb-1 flex items-center justify-between gap-2 print:hidden">
              <Button
                className="h-9 px-3 text-xs"
                data-tutorial="library-button"
                onClick={() => setMobileLibraryOpen(true)}
                size="sm"
                type="button"
                variant="outline"
              >
                <PanelLeft className="h-4 w-4" />
                Library
              </Button>
              <Button
                className="h-9 px-3 text-xs"
                data-tutorial="details-button"
                disabled={!selectedPaste}
                onClick={() => setMobileDetailsOpen(true)}
                size="sm"
                type="button"
                variant="outline"
              >
                <PanelRight className="h-4 w-4" />
                Details
              </Button>
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {renderEditor()}
            </div>
          </div>
        ) : (
          <>
        {leftSidebarCollapsed && rightSidebarCollapsed ? (
          <div className="flex shrink-0 flex-row items-center justify-center gap-4 border-b border-border py-1 print:hidden lg:hidden">
            <Button
              aria-label="Show library sidebar"
              className="h-9 w-9 touch-manipulation"
              onClick={() => setLeftSidebarCollapsed(false)}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Show details sidebar"
              className="h-9 w-9 touch-manipulation"
              onClick={() => setRightSidebarCollapsed(false)}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
        {leftSidebarCollapsed ? (
          <div
            className={cn(
              "flex shrink-0 justify-center border-b border-border py-1.5 print:hidden lg:w-11 lg:flex-col lg:border-b-0 lg:border-r lg:py-3",
              leftSidebarCollapsed && rightSidebarCollapsed && "hidden lg:flex"
            )}
          >
            <Button
              aria-label="Show library sidebar"
              className="h-9 w-9 touch-manipulation"
              onClick={() => setLeftSidebarCollapsed(false)}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="min-h-0 min-w-0 max-h-[min(40dvh,20rem)] shrink-0 overflow-hidden print:hidden lg:max-h-none lg:w-[min(100%,340px)] lg:max-w-[380px] lg:shrink-0">
            {renderSidebar()}
          </div>
        )}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col print:w-full print:max-w-none max-lg:min-h-[min(58dvh,24rem)]">
          {renderEditor()}
        </div>
        {rightSidebarCollapsed ? (
          <div
            className={cn(
              "flex shrink-0 justify-center border-t border-border py-1.5 print:hidden lg:w-11 lg:flex-col lg:border-l lg:border-t-0 lg:py-3",
              leftSidebarCollapsed && rightSidebarCollapsed && "hidden lg:flex"
            )}
          >
            <Button
              aria-label="Show details sidebar"
              className="h-9 w-9 touch-manipulation"
              onClick={() => setRightSidebarCollapsed(false)}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="min-h-0 min-w-0 max-h-[min(36dvh,18rem)] shrink-0 overflow-y-auto overflow-x-hidden print:hidden lg:max-h-none lg:w-[min(100%,360px)] lg:max-w-[420px] lg:shrink-0">
            {renderDetails()}
          </div>
        )}
          </>
        )}
      </section>
        </div>

      {selectedPaste ? (
        phoneViewport ? (
          <div className="glass-panel z-10 flex shrink-0 items-center justify-between gap-2 border-t border-border px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] print:hidden md:hidden">
            <Button className="h-9 min-h-9 flex-1 gap-1.5 px-2.5 text-[11px]" data-tutorial="library-button" onClick={() => setMobileLibraryOpen(true)} size="sm" type="button" variant="outline">
              <PanelLeft className="h-4 w-4" />
              Library
            </Button>
            <Button className="h-9 min-h-9 flex-1 gap-1.5 px-2.5 text-[11px]" onClick={() => void handleSavePaste()} size="sm" type="button">
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button className="h-9 min-h-9 flex-1 gap-1.5 px-2.5 text-[11px]" onClick={handleNewPaste} size="sm" type="button" variant="outline">
              <FilePlus2 className="h-4 w-4" />
              New
            </Button>
            <Button
              className="h-9 min-h-9 flex-1 gap-1.5 px-2.5 text-[11px]"
              data-tutorial="details-button"
              disabled={!selectedPaste}
              onClick={() => setMobileDetailsOpen(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              <PanelRight className="h-4 w-4" />
              Details
            </Button>
          </div>
        ) : (
          <div className="glass-panel z-10 flex shrink-0 items-start justify-between gap-3 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] print:hidden md:hidden">
            <div className="min-w-0 flex-1 pr-1">
              <p
                className="line-clamp-2 text-sm font-medium leading-snug break-words"
                title={(selectedPaste.title || "Untitled").trim() || "Untitled"}
              >
                {(selectedPaste.title || "Untitled").trim() || "Untitled"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{selectedPaste.language}</p>
            </div>
            <div className="flex shrink-0 touch-manipulation gap-2 self-start pt-0.5">
              <Button className="h-9 min-h-9 gap-1.5 px-3 text-xs" onClick={() => void handleSavePaste()} size="sm" type="button">
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button className="h-9 min-h-9 gap-1.5 px-3 text-xs" onClick={handleNewPaste} size="sm" type="button" variant="outline">
                <FilePlus2 className="h-4 w-4" />
                New
              </Button>
            </div>
          </div>
        )
      ) : null}
      </div>

      <WorkspaceTutorial
        onClose={closeTutorial}
        onStepIndexChange={setTutorialStepIndex}
        onTourChange={changeTutorialTour}
        open={tutorialOpen}
        stepIndex={tutorialStepIndex}
        tourId={activeTutorialTour?.id ?? tutorialTourId}
        tours={tutorialTours}
      />

      <Dialog onOpenChange={setMobileLibraryOpen} open={phoneViewport && mobileLibraryOpen}>
        <DialogContent className="flex h-[min(92dvh,56rem)] w-[calc(100vw-1rem)] max-w-none flex-col overflow-hidden rounded-[1.25rem] p-0 sm:max-w-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Workspace library</DialogTitle>
            <DialogDescription>Browse, filter, import, and open pastes from your workspace library.</DialogDescription>
          </DialogHeader>
          {renderSidebar()}
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setMobileDetailsOpen} open={phoneViewport && mobileDetailsOpen}>
        <DialogContent className="flex h-[min(92dvh,56rem)] w-[calc(100vw-1rem)] max-w-none flex-col overflow-hidden rounded-[1.25rem] p-4 sm:max-w-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Paste details</DialogTitle>
            <DialogDescription>Manage language, folder, sharing, versions, and advanced settings for the current paste.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden">{renderDetails()}</div>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setMobileFolderActions({ open: false });
          }
        }}
        open={phoneViewport && mobileFolderActions.open}
      >
        <DialogContent className="w-[calc(100vw-1rem)] max-w-sm rounded-[1.25rem] p-5">
          <DialogHeader>
            <DialogTitle>
              {mobileFolderActions.open
                ? mobileFolderActions.kind === "all"
                  ? "All pastes"
                  : mobileFolderActions.folderName
                : "Folder actions"}
            </DialogTitle>
            <DialogDescription>
              {mobileFolderActions.open && mobileFolderActions.kind === "all"
                ? "Quick actions for your full workspace library."
                : "Manage this folder without needing desktop right-click."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-2">
            <Button
              className="justify-start"
              onClick={() => {
                if (!mobileFolderActions.open) {
                  return;
                }
                setSidebarFolder("all");
                setMobileFolderActions({ open: false });
              }}
              type="button"
              variant="outline"
            >
              <FolderInput className="h-4 w-4" />
              Show all pastes
            </Button>
            {mobileFolderActions.open && mobileFolderActions.kind === "folder" ? (
              <Button
                className="justify-start"
                onClick={() => {
                  void navigator.clipboard.writeText(mobileFolderActions.folderName);
                  setStatus(`Copied folder name "${mobileFolderActions.folderName}".`);
                  setMobileFolderActions({ open: false });
                }}
                type="button"
                variant="outline"
              >
                <Copy className="h-4 w-4" />
                Copy folder name
              </Button>
            ) : null}
            {mobileFolderActions.open && mobileFolderActions.kind === "folder" ? (
              <Button
                className="justify-start"
                onClick={() => {
                  const folderName = mobileFolderActions.folderName;
                  setSidebarFolder(folderName);
                  setMobileFolderActions({ open: false });
                }}
                type="button"
                variant="outline"
              >
                <Search className="h-4 w-4" />
                Filter to this folder
              </Button>
            ) : null}
            <Button
              className="justify-start"
              onClick={() => {
                setMobileFolderActions({ open: false });
                window.setTimeout(() => openNewFolderModal(), 0);
              }}
              type="button"
              variant="outline"
            >
              <FolderPlus className="h-4 w-4" />
              New folder…
            </Button>
            {mobileFolderActions.open && mobileFolderActions.kind === "folder" ? (
              <Button
                className="justify-start"
                onClick={() => {
                  const folderName = mobileFolderActions.folderName;
                  setMobileFolderActions({ open: false });
                  window.setTimeout(() => openRenameFolderModal(folderName), 0);
                }}
                type="button"
                variant="outline"
              >
                <Pencil className="h-4 w-4" />
                Rename folder…
              </Button>
            ) : null}
            {mobileFolderActions.open && mobileFolderActions.kind === "folder" ? (
              <Button
                className="justify-start"
                onClick={() => {
                  const folderName = mobileFolderActions.folderName;
                  setMobileFolderActions({ open: false });
                  void handleDeleteFolder(folderName);
                }}
                type="button"
                variant="destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete folder…
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setMobilePasteActions({ open: false });
          }
        }}
        open={phoneViewport && mobilePasteActions.open}
      >
        <DialogContent className="w-[calc(100vw-1rem)] max-w-sm rounded-[1.25rem] p-5">
          <DialogHeader>
            <DialogTitle>{mobilePasteActionTarget?.title ?? "Paste actions"}</DialogTitle>
            <DialogDescription>Everything you’d normally reach with right-click on desktop.</DialogDescription>
          </DialogHeader>
          {mobilePasteActionTarget ? (
            <div className="mt-2 flex flex-col gap-2">
              <Button
                className="justify-start"
                onClick={() => {
                  setSelectedId(mobilePasteActionTarget.id);
                  setMobilePasteActions({ open: false });
                  setMobileLibraryOpen(false);
                }}
                type="button"
                variant="outline"
              >
                <FilePlus2 className="h-4 w-4" />
                Open
              </Button>
              <Button
                className="justify-start"
                onClick={() => {
                  duplicatePasteById(mobilePasteActionTarget.id);
                  setMobilePasteActions({ open: false });
                }}
                type="button"
                variant="outline"
              >
                <WandSparkles className="h-4 w-4" />
                Fork
              </Button>
              <Button
                className="justify-start"
                onClick={() => {
                  void navigator.clipboard.writeText(mobilePasteActionTarget.content);
                  setStatus("Copied paste contents to clipboard.");
                  setMobilePasteActions({ open: false });
                }}
                type="button"
                variant="outline"
              >
                <Copy className="h-4 w-4" />
                Copy all text
              </Button>
              {mobilePasteActionTarget.slug &&
              !isAccountOnlyDraft(mobilePasteActionTarget, mode) &&
              mobilePasteActionTarget.visibility !== "private" ? (
                <Button
                  className="justify-start"
                  onClick={() => {
                    const url = getPasteShareUrl(
                      window.location.origin,
                      mobilePasteActionTarget.slug!,
                      mobilePasteActionTarget.secretMode
                    );
                    void navigator.clipboard.writeText(url);
                    setStatus("Copied share link.");
                    setMobilePasteActions({ open: false });
                  }}
                  type="button"
                  variant="outline"
                >
                  <Share2 className="h-4 w-4" />
                  Copy share link
                </Button>
              ) : null}
              {mobilePasteActionTarget.slug &&
              !isAccountOnlyDraft(mobilePasteActionTarget, mode) &&
              mobilePasteActionTarget.visibility !== "private" ? (
                <Button
                  className="justify-start"
                  onClick={() => {
                    const url = `${window.location.origin}/raw/${mobilePasteActionTarget.slug}`;
                    void navigator.clipboard.writeText(url);
                    setStatus("Copied raw URL.");
                    setMobilePasteActions({ open: false });
                  }}
                  type="button"
                  variant="outline"
                >
                  <Link2 className="h-4 w-4" />
                  Copy raw URL
                </Button>
              ) : null}
              {snapshot.pastes.some((paste) => paste.id === mobilePasteActionTarget.id) ? (
                <>
                  <Button
                    className="justify-start"
                    onClick={() => {
                      setBatchSelected(new Set([mobilePasteActionTarget.id]));
                      setMobilePasteActions({ open: false });
                      window.setTimeout(() => setBatchMoveOpen(true), 0);
                    }}
                    type="button"
                    variant="outline"
                  >
                    <FolderInput className="h-4 w-4" />
                    Move / rename…
                  </Button>
                  <Button
                    className="justify-start"
                    onClick={() => {
                      toggleBatchId(mobilePasteActionTarget.id);
                      setMobilePasteActions({ open: false });
                    }}
                    type="button"
                    variant="outline"
                  >
                    <ListOrdered className="h-4 w-4" />
                    {batchSelected.has(mobilePasteActionTarget.id) ? "Deselect for batch" : "Select for batch"}
                  </Button>
                  <Button
                    className="justify-start"
                    onClick={() => {
                      setMobilePasteActions({ open: false });
                      void deletePasteById(mobilePasteActionTarget.id);
                    }}
                    type="button"
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isAccountOnlyDraft(mobilePasteActionTarget, mode) ? "Discard draft" : "Delete"}
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {selectedPaste ? (
        <CodeImageDialog
          content={selectedPaste.content}
          exportBasename={selectedPaste.title}
          language={selectedPaste.language}
          onOpenChange={setCodeImageOpen}
          open={codeImageOpen}
        />
      ) : null}

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setFolderModal({ open: false });
          }
        }}
        open={folderModal.open}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {folderModal.open ? (folderModal.mode === "rename" ? "Rename folder" : "New folder") : "Folder"}
            </DialogTitle>
            <DialogDescription>
              {folderModal.open && folderModal.mode === "rename" ? (
                <>
                  Change the name for &quot;{folderModal.from}&quot;. Pastes in this folder are updated automatically.
                </>
              ) : (
                <>Folders show up in the library filter bar so you can organize pastes before or after saving.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            id="wox-folder-modal-name"
            onChange={(event) => setFolderModalName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (!folderModal.open) {
                  return;
                }
                if (folderModal.mode === "new") {
                  void submitCreateFolder(folderModalName);
                } else {
                  void submitRenameFolder(folderModal.from, folderModalName);
                }
              }
            }}
            placeholder="Folder name"
            value={folderModalName}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button onClick={() => setFolderModal({ open: false })} type="button" variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={saving || !folderModalName.trim()}
              onClick={() => {
                if (!folderModal.open) {
                  return;
                }
                if (folderModal.mode === "new") {
                  void submitCreateFolder(folderModalName);
                } else {
                  void submitRenameFolder(folderModal.from, folderModalName);
                }
              }}
              type="button"
            >
              {folderModal.open && folderModal.mode === "rename" ? "Rename" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          setBatchMoveOpen(open);
          if (!open) {
            setBatchMoveFolder("");
          }
        }}
        open={batchMoveOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to folder</DialogTitle>
            <DialogDescription>
              Applies to {batchSelected.size} selected paste{batchSelected.size === 1 ? "" : "s"}. Type an existing folder name or a new
              one — new names are added to your workspace list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="wox-batch-move-folder">
              Folder name
            </label>
            <Input
              id="wox-batch-move-folder"
              list="wox-batch-move-datalist"
              onChange={(event) => setBatchMoveFolder(event.target.value)}
              placeholder="e.g. Notes, Code, Snippets"
              value={batchMoveFolder}
            />
            <datalist id="wox-batch-move-datalist">
              {[...snapshot.folders].sort((a, b) => a.localeCompare(b)).map((folder) => (
                <option key={folder} value={folder} />
              ))}
            </datalist>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button onClick={() => setBatchMoveOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={saving || !batchMoveFolder.trim()}
              onClick={() => void handleBatchMove()}
              type="button"
            >
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setTemplatesOpen} open={templatesOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Templates</DialogTitle>
            <DialogDescription>Built-in starters or pastes you marked with &quot;Save as template&quot;.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 text-sm">
            <div>
              <p className="mb-2 font-medium text-foreground">Built-in</p>
              <ul className="space-y-2">
                {BUILTIN_TEMPLATES.map((t) => (
                  <li className="flex items-start justify-between gap-3" key={t.id}>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{t.title}</p>
                      {t.description ? <p className="text-xs text-muted-foreground">{t.description}</p> : null}
                    </div>
                    <Button onClick={() => applyBuiltinTemplate(t)} size="sm" type="button">
                      Use
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 font-medium text-foreground">Your templates</p>
              {snapshot.pastes.filter((p) => p.template).length === 0 ? (
                <p className="text-muted-foreground">Enable &quot;Save as template&quot; in paste details.</p>
              ) : (
                <ul className="space-y-2">
                  {snapshot.pastes
                    .filter((p) => p.template)
                    .map((p) => (
                      <li className="flex flex-wrap items-center justify-between gap-2" key={p.id}>
                        <span className="truncate">{p.title}</span>
                        <div className="flex gap-2">
                          <Button onClick={() => applyUserTemplate(p)} size="sm" type="button">
                            Use
                          </Button>
                          <Button
                            disabled={saving}
                            onClick={() => void removeTemplateFromPaste(p)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Remove
                          </Button>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setShortcutsOpen} open={shortcutsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>Same spirit as the legacy desktop app.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm text-foreground">
            <li>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">⌘/Ctrl + K</kbd>{" "}
              — Focus library search
            </li>
            <li>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">⌘/Ctrl + N</kbd> — New
              paste
            </li>
            <li>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">⌘/Ctrl + S</kbd> — Save
              paste
            </li>
            <li>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">⌘/Ctrl + F</kbd> — Find
              in editor
            </li>
            <li>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">⌘/Ctrl + Shift + B</kbd>{" "}
              — Jump to matching bracket
            </li>
            <li>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">⌘/Ctrl + H</kbd> — Replace
              dialog
            </li>
            <li>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">⌘/Ctrl + P</kbd> — Quick
              open paste (library picker)
            </li>
            <li>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">?</kbd> — Shortcuts (when
              not typing in a field)
            </li>
          </ul>
          <p className="text-muted-foreground mt-4 border-t border-border pt-3 text-xs leading-relaxed">
            <span className="font-medium text-foreground">Header:</span> app UI (dark / light / system), syntax colors, workspace
            backdrop, and high-contrast borders (whole site).{" "}
            <span className="font-medium text-foreground">Editor (View ribbon):</span> line numbers, word wrap,{" "}
            <strong>active indent guides</strong> (VS Code–style vertical lines only at the caret line’s tab-stop depths),
            and <strong>print</strong> options (wrap long lines on paper, comfortable / minimal / document layout). Guides use
            a <strong>canvas overlay</strong> (content-aware), not CSS alone; they stay off while word wrap is enabled.
            Preferences are saved in this browser (<code className="rounded bg-muted px-1">localStorage</code>).
          </p>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          setQuickOpenOpen(open);
          if (!open) {
            setQuickOpenQuery("");
          }
        }}
        open={quickOpenOpen}
      >
        <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden">
          <DialogHeader>
            <DialogTitle>Quick open</DialogTitle>
            <DialogDescription>Jump to a paste in your workspace (legacy Ctrl+P).</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            onChange={(e) => setQuickOpenQuery(e.target.value)}
            placeholder="Filter by title or content…"
            value={quickOpenQuery}
          />
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1 text-sm">
            {snapshot.pastes
              .filter((p) => {
                const q = quickOpenQuery.trim().toLowerCase();
                if (!q) {
                  return true;
                }
                return `${p.title}\n${p.content}`.toLowerCase().includes(q);
              })
              .slice(0, 80)
              .map((p) => (
                <button
                  className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-left hover:bg-muted/70"
                  key={p.id}
                  onClick={() => {
                    setSidebarFolder("all");
                    setSelectedId(p.id);
                    setQuickOpenOpen(false);
                    setQuickOpenQuery("");
                  }}
                  type="button"
                >
                  <span className="font-medium text-foreground">{p.title}</span>
                  <span className="mt-1 line-clamp-1 block text-xs text-muted-foreground">{p.content || "Empty"}</span>
                </button>
              ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setQuickOpenOpen(false)} type="button" variant="ghost">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          setShareBuilderOpen(open);
          if (!open) {
            setShareLineStart("");
            setShareLineEnd("");
          }
        }}
        open={shareBuilderOpen}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Share builder</DialogTitle>
            <DialogDescription>Link variants, embed, and QR (legacy-style helpers).</DialogDescription>
          </DialogHeader>
          {selectedPaste &&
          !isAccountOnlyDraft(selectedPaste, mode) &&
          selectedPaste.slug ? (
            <ShareBuilderPanel
              lineEnd={shareLineEnd}
              lineStart={shareLineStart}
              onLineEndChange={setShareLineEnd}
              onLineStartChange={setShareLineStart}
              slug={selectedPaste.slug}
              secretMode={selectedPaste.secretMode}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Save this paste to your account to get a public slug and share URLs.</p>
          )}
          <DialogFooter>
            <Button onClick={() => setShareBuilderOpen(false)} type="button" variant="ghost">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setImportUrlOpen} open={importUrlOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from URL</DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block">
                Paste a link to a <strong>raw</strong> file, or a normal page from{" "}
                <strong>Pastebin</strong>, <strong>Hastebin</strong>, <strong>dpaste</strong>, <strong>rentry</strong>,{" "}
                <strong>paste.ee</strong>, <strong>paste.mozilla.org</strong>, <strong>paste.debian.net</strong>, or a{" "}
                <strong>GitHub Gist</strong> — we resolve the right endpoint when you import (signed in).
              </span>
              <span className="block text-muted-foreground">
                Signed in: server fetch (recommended for Pastebin and similar). Signed out: direct browser fetch only if the site
                allows CORS; otherwise sign in.
              </span>
            </DialogDescription>
          </DialogHeader>
          <Input
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="https://pastebin.com/AbCdEf12 or https://gist.github.com/you/id"
            value={importUrl}
          />
          <DialogFooter>
            <Button onClick={() => setImportUrlOpen(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={importUrlBusy} onClick={() => void submitImportUrl()} type="button">
              {importUrlBusy ? "Fetching…" : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setDiffVersion(null);
          }
        }}
        open={Boolean(diffVersion)}
      >
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Diff: version → current</DialogTitle>
            <DialogDescription>Green = added in current, red = removed (was in saved version).</DialogDescription>
          </DialogHeader>
          <div
            className="diff-pretty-html min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-muted/60 p-3 text-sm leading-relaxed dark:bg-black/30"
            dangerouslySetInnerHTML={{ __html: diffVersionHtml || "<p class='text-muted-foreground'>No diff.</p>" }}
          />
        </DialogContent>
      </Dialog>
      </div>
    </main>
  );
}
