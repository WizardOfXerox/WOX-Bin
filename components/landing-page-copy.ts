import type { UiLanguage } from "@/lib/i18n";

export type LandingPageCopy = {
  heroTitle: string;
  heroLeadStart: string;
  heroLeadMiddle: string;
  heroLeadSupport: string;
  heroLeadChangelog: string;
  heroLeadToolsEnabled: string;
  heroLeadToolsDisabled: string;
  plansAndPricing: string;
  tagline: string;
  marketingBullets: string[];
  comparePlans: string;
  viewChangelog: string;
  archiveLink: string;
  bookmarkfsLink: string;
  quickPasteLink: string;
  clipboardBucketsLink: string;
  toolsLink: string;
  featureBadges: string[];
  featureCards: Array<{ title: string; body: string }>;
  toolsCardTitle: string;
  toolsCardBody: string;
  currentSurfaceEyebrow: string;
  currentSurfaceTitle: string;
  shippingNow: string;
  quickLinksTitle: string;
  quickLinksPricing: string;
  quickLinksDocs: string;
  quickLinksBookmarkfs: string;
  quickLinksQuickPaste: string;
  quickLinksFragment: string;
  quickLinksClipboard: string;
  quickLinksHelp: string;
  quickLinksSupport: string;
  quickLinksChangelog: string;
  quickLinksTools: string;
  quickLinksArchive: string;
  quickLinksForgotPassword: string;
  recentChangesTitle: string;
  readFullChangelog: string;
  themesTitle: string;
  themesBody: string;
  startHereTitle: string;
  startHereBody: string;
  footerApiDocs: string;
  footerTools: string;
  footerTerms: string;
  footerPrivacy: string;
};

export const LANDING_PAGE_COPY: Record<UiLanguage, LandingPageCopy> = {
  en: {
    heroTitle: "A paste workspace, quick-share hub, and operator-ready control surface.",
    heroLeadStart: "Start in the ribbon workspace at",
    heroLeadMiddle:
      ", use the built-in tutorial to learn the layout, then branch into quick routes for secret links, clipboard buckets, and fragment-only sharing when you need lower-friction handoff. The browser companion lives at",
    heroLeadSupport: ", support lives at",
    heroLeadChangelog: ", and the running product history lives at",
    heroLeadToolsEnabled: ". Browser utilities are also available at",
    heroLeadToolsDisabled: ". The tools surface is temporarily disabled while it is being finished. See",
    plansAndPricing: "plans & pricing",
    tagline:
      "A local-first paste workspace with quick-share routes, secret links, built-in templates, internal support, and admin-ready operations.",
    marketingBullets: [
      "Ribbon workspace with formatting tools, find/replace, JSON helpers, print, and built-in templates for every supported language",
      "Prism syntax themes, line numbers, Markdown preview, clickable shared links, code-image export, and multi-file pastes with per-file languages",
      "Quick paste, clipboard buckets, fragment-only sharing, Pro custom URLs, and secret links all run on the same hosted surface",
      "Local drafts or signed-in sync with folders, versions, stars, comments, public archive pages, API keys, and BookmarkFS companion flows",
      "First-run onboarding starts with the bundled megademo paste and a reopenable guided tutorial inside the workspace",
      "Turnstile, rate limits, email verification, Google sign-in, internal support tickets, moderation controls, and admin operations"
    ],
    comparePlans: "Compare plans",
    viewChangelog: "View changelog",
    archiveLink: "Archive",
    bookmarkfsLink: "BookmarkFS",
    quickPasteLink: "Quick paste",
    clipboardBucketsLink: "Clipboard buckets",
    toolsLink: "Tools",
    featureBadges: [
      "Ribbon editor & Prism",
      "Templates for every language",
      "Multi-file pastes",
      "Secret links & Pro custom URLs",
      "Quick paste & clipboard buckets",
      "Local + cloud sync",
      "Guided workspace tutorial",
      "Internal support tickets",
      "Admin & moderation",
      "BookmarkFS companion",
      "Free · Pro · Team",
      "Browser tools hub"
    ],
    featureCards: [
      {
        title: "Ribbon workspace",
        body: "Home, Insert, Layout, and View tabs with formatting helpers, lists, indent, find/replace, timestamps, fenced code, tables, JSON tools, print, and template application in one strip."
      },
      {
        title: "Code-aware editor",
        body: "Prism themes, line numbers, wrap, tab indent, bracket highlights, and a transparent caret layer locked to the syntax highlight."
      },
      {
        title: "Files & sharing",
        body: "Attach multiple files per paste with per-file languages, Markdown preview, code-image export, and public, unlisted, secret, or custom-URL sharing with privacy redirect support."
      },
      {
        title: "Modes & polish",
        body: "IndexedDB local drafts or signed-in sync, folders and pins, quick open, import URL, API uploads, a first-run megademo paste, and a reopenable tutorial."
      },
      {
        title: "Social & public",
        body: "Comments and stars on shared pastes, public feed and archive, visible view counts, anonymous publish flow, and moderation-aware visibility."
      },
      {
        title: "Trust & accounts",
        body: "Turnstile, rate limits, email verification, Google sign-in, password reset, session controls, and admin and moderator operations."
      },
      {
        title: "Quick-share surfaces",
        body: "Use /quick for fast creation, /clipboard for short-lived buckets, /fragment for browser-only shares, and /s/[slug] for secret links that stay off community surfaces."
      },
      {
        title: "Plans & recovery",
        body: "Pricing summarizes Free, Pro, and Team. Use forgot password if you registered with an email, and keep up with product changes in the changelog."
      }
    ],
    toolsCardTitle: "Tools beyond pastes",
    toolsCardBody:
      "Client-side converters and utilities for PDF, images, data, ZIP workflows, and more from the /tools hub.",
    currentSurfaceEyebrow: "Current surface",
    currentSurfaceTitle: "Built for actual operator use",
    shippingNow: "Shipping now",
    quickLinksTitle: "Quick links",
    quickLinksPricing: "Pricing & billing",
    quickLinksDocs: "API & documentation",
    quickLinksBookmarkfs: "BookmarkFS companion",
    quickLinksQuickPaste: "Quick paste",
    quickLinksFragment: "Fragment share",
    quickLinksClipboard: "Clipboard buckets",
    quickLinksHelp: "Help & answers",
    quickLinksSupport: "Support",
    quickLinksChangelog: "Changelog",
    quickLinksTools: "Browser tools",
    quickLinksArchive: "Public archive",
    quickLinksForgotPassword: "Forgot password",
    recentChangesTitle: "Recent changes",
    readFullChangelog: "Read the full changelog",
    themesTitle: "Themes & accessibility",
    themesBody:
      "Switch syntax colors per paste, toggle a light app shell that keeps text contrast in check, optional high-contrast chrome, and deep vs balanced workspace backgrounds.",
    startHereTitle: "Start here",
    startHereBody:
      "Open the workspace and use the Tutorial button in the header for a guided pass over the live controls. After that, press ? in the editor for shortcuts such as quick open, new paste, save, find, and replace.",
    footerApiDocs: "API & docs",
    footerTools: "Tools",
    footerTerms: "Terms",
    footerPrivacy: "Privacy"
  },
  fil: {
    heroTitle: "Isang paste workspace, quick-share hub, at control surface na handa para sa actual na paggamit.",
    heroLeadStart: "Magsimula sa ribbon workspace sa",
    heroLeadMiddle:
      ", gamitin ang built-in tutorial para matutunan ang layout, saka lumipat sa quick routes para sa secret links, clipboard buckets, at fragment-only sharing kapag kailangan mo ng mas mabilis na handoff. Nasa",
    heroLeadSupport: "ang browser companion, nasa",
    heroLeadChangelog: "ang support, at nasa",
    heroLeadToolsEnabled: "ang running product history. Available rin ang browser utilities sa",
    heroLeadToolsDisabled: "ang running product history. Pansamantalang naka-disable ang tools surface habang tinatapos ito. Tingnan ang",
    plansAndPricing: "mga plan at presyo",
    tagline:
      "Isang local-first paste workspace na may quick-share routes, secret links, built-in templates, internal support, at admin-ready operations.",
    marketingBullets: [
      "Ribbon workspace na may formatting tools, find/replace, JSON helpers, print, at built-in templates para sa bawat suportadong language",
      "Prism syntax themes, line numbers, Markdown preview, clickable shared links, code-image export, at multi-file pastes na may per-file languages",
      "Quick paste, clipboard buckets, fragment-only sharing, Pro custom URLs, at secret links na tumatakbo sa iisang hosted surface",
      "Local drafts o signed-in sync na may folders, versions, stars, comments, public archive pages, API keys, at BookmarkFS companion flows",
      "Nagsisimula ang first-run onboarding sa bundled megademo paste at reopenable guided tutorial sa loob ng workspace",
      "Turnstile, rate limits, email verification, Google sign-in, internal support tickets, moderation controls, at admin operations"
    ],
    comparePlans: "Ihambing ang plans",
    viewChangelog: "Tingnan ang changelog",
    archiveLink: "Archive",
    bookmarkfsLink: "BookmarkFS",
    quickPasteLink: "Quick paste",
    clipboardBucketsLink: "Clipboard buckets",
    toolsLink: "Tools",
    featureBadges: [
      "Ribbon editor at Prism",
      "Templates para sa bawat language",
      "Multi-file pastes",
      "Secret links at Pro custom URLs",
      "Quick paste at clipboard buckets",
      "Local + cloud sync",
      "Guided workspace tutorial",
      "Internal support tickets",
      "Admin at moderation",
      "BookmarkFS companion",
      "Free · Pro · Team",
      "Browser tools hub"
    ],
    featureCards: [
      {
        title: "Ribbon workspace",
        body: "Mga Home, Insert, Layout, at View tab na may formatting helpers, lists, indent, find/replace, timestamps, fenced code, tables, JSON tools, print, at template application sa iisang strip."
      },
      {
        title: "Code-aware editor",
        body: "Prism themes, line numbers, wrap, tab indent, bracket highlights, at transparent caret layer na nakatugma sa syntax highlight."
      },
      {
        title: "Files at sharing",
        body: "Mag-attach ng maraming file bawat paste na may per-file languages, Markdown preview, code-image export, at public, unlisted, secret, o custom-URL sharing na may privacy redirect."
      },
      {
        title: "Modes at polish",
        body: "IndexedDB local drafts o signed-in sync, folders at pins, quick open, import URL, API uploads, first-run megademo paste, at reopenable tutorial."
      },
      {
        title: "Social at public",
        body: "Comments at stars sa shared pastes, public feed at archive, visible view counts, anonymous publish flow, at moderation-aware visibility."
      },
      {
        title: "Trust at accounts",
        body: "Turnstile, rate limits, email verification, Google sign-in, password reset, session controls, at admin at moderator operations."
      },
      {
        title: "Quick-share surfaces",
        body: "Gamitin ang /quick para sa mabilis na creation, /clipboard para sa short-lived buckets, /fragment para sa browser-only shares, at /s/[slug] para sa secret links na wala sa community surfaces."
      },
      {
        title: "Plans at recovery",
        body: "Ipinapakita ng Pricing ang Free, Pro, at Team. Gamitin ang forgot password kung email ang ginamit mo sa registration, at sundan ang product changes sa changelog."
      }
    ],
    toolsCardTitle: "Tools lampas sa pastes",
    toolsCardBody:
      "Mga client-side converter at utility para sa PDF, images, data, ZIP workflows, at iba pa mula sa /tools hub.",
    currentSurfaceEyebrow: "Kasalukuyang surface",
    currentSurfaceTitle: "Ginawa para sa totoong operator use",
    shippingNow: "Live na ngayon",
    quickLinksTitle: "Mabilis na links",
    quickLinksPricing: "Presyo at billing",
    quickLinksDocs: "API at docs",
    quickLinksBookmarkfs: "BookmarkFS companion",
    quickLinksQuickPaste: "Quick paste",
    quickLinksFragment: "Fragment share",
    quickLinksClipboard: "Clipboard buckets",
    quickLinksHelp: "Tulong at sagot",
    quickLinksSupport: "Support",
    quickLinksChangelog: "Changelog",
    quickLinksTools: "Browser tools",
    quickLinksArchive: "Public archive",
    quickLinksForgotPassword: "Forgot password",
    recentChangesTitle: "Mga kamakailang pagbabago",
    readFullChangelog: "Basahin ang buong changelog",
    themesTitle: "Themes at accessibility",
    themesBody:
      "Palitan ang syntax colors bawat paste, gumamit ng light app shell na malinaw pa rin ang contrast, optional high-contrast chrome, at deep vs balanced workspace backgrounds.",
    startHereTitle: "Dito magsimula",
    startHereBody:
      "Buksan ang workspace at gamitin ang Tutorial button sa header para sa guided pass sa live controls. Pagkatapos, pindutin ang ? sa editor para sa shortcuts gaya ng quick open, new paste, save, find, at replace.",
    footerApiDocs: "API at docs",
    footerTools: "Tools",
    footerTerms: "Mga tuntunin",
    footerPrivacy: "Privacy"
  },
  ja: {
    heroTitle: "ペースト用ワークスペース、クイック共有ハブ、そして実運用向けのコントロール面をひとつに。",
    heroLeadStart: "まずは",
    heroLeadMiddle:
      "のリボン型ワークスペースから始め、内蔵チュートリアルで操作を覚えたあと、秘密リンク、クリップボードバケット、フラグメント共有へすばやく移れます。ブラウザ companion は",
    heroLeadSupport: "、サポートは",
    heroLeadChangelog: "、製品の更新履歴は",
    heroLeadToolsEnabled: "にあります。ブラウザ用ユーティリティは",
    heroLeadToolsDisabled: "にあります。ツール面は現在仕上げ中のため一時的に無効です。詳しくは",
    plansAndPricing: "プランと料金",
    tagline:
      "ローカルファーストのペーストワークスペース。クイック共有ルート、秘密リンク、内蔵テンプレート、内部サポート、管理向け機能を備えています。",
    marketingBullets: [
      "整形ツール、検索/置換、JSON ヘルパー、印刷、各言語向けテンプレートを備えたリボンワークスペース",
      "Prism シンタックステーマ、行番号、Markdown プレビュー、共有リンク、コード画像書き出し、複数ファイルペースト",
      "クイックペースト、クリップボードバケット、フラグメント共有、Pro カスタム URL、秘密リンクを同じホスト面で提供",
      "ローカル下書きまたはサインイン同期に加え、フォルダ、バージョン、スター、コメント、公開アーカイブ、API キー、BookmarkFS companion を利用可能",
      "初回オンボーディングはメガデモペーストと、再表示できるワークスペース内チュートリアルから始まります",
      "Turnstile、レート制限、メール認証、Google サインイン、内部サポートチケット、モデレーション、管理機能"
    ],
    comparePlans: "プランを比較",
    viewChangelog: "更新履歴を見る",
    archiveLink: "アーカイブ",
    bookmarkfsLink: "BookmarkFS",
    quickPasteLink: "クイックペースト",
    clipboardBucketsLink: "クリップボードバケット",
    toolsLink: "ツール",
    featureBadges: [
      "リボンエディタと Prism",
      "各言語用テンプレート",
      "複数ファイル対応ペースト",
      "秘密リンクと Pro カスタム URL",
      "クイックペーストとクリップボードバケット",
      "ローカル + クラウド同期",
      "ガイド付きワークスペースチュートリアル",
      "内部サポートチケット",
      "管理とモデレーション",
      "BookmarkFS companion",
      "Free · Pro · Team",
      "ブラウザツールハブ"
    ],
    featureCards: [
      {
        title: "リボンワークスペース",
        body: "Home、Insert、Layout、View タブに、整形補助、リスト、インデント、検索/置換、タイムスタンプ、コードブロック、表、JSON ツール、印刷、テンプレート適用をまとめています。"
      },
      {
        title: "コード対応エディタ",
        body: "Prism テーマ、行番号、折り返し、タブインデント、括弧ハイライト、そしてシンタックス表示に揃う透明キャレットレイヤーを備えます。"
      },
      {
        title: "ファイルと共有",
        body: "ファイルごとの言語指定、Markdown プレビュー、コード画像書き出し、公開・限定公開・秘密・カスタム URL 共有に対応します。"
      },
      {
        title: "モードと仕上げ",
        body: "IndexedDB のローカル下書き、サインイン同期、フォルダ、ピン留め、クイックオープン、URL 取り込み、API アップロード、メガデモ、再表示可能なチュートリアルを備えます。"
      },
      {
        title: "公開と交流",
        body: "共有ペーストへのコメントとスター、公開フィードとアーカイブ、閲覧数、匿名公開フロー、モデレーション対応の可視性設定があります。"
      },
      {
        title: "信頼とアカウント",
        body: "Turnstile、レート制限、メール認証、Google サインイン、パスワード再設定、セッション管理、管理者/モデレーター機能に対応します。"
      },
      {
        title: "クイック共有面",
        body: "高速作成は /quick、短命バケットは /clipboard、ブラウザ限定共有は /fragment、コミュニティ面に出ない秘密リンクは /s/[slug] を使います。"
      },
      {
        title: "プランと復旧",
        body: "Pricing では Free、Pro、Team を比較できます。メール登録なら forgot password を使い、変更履歴は changelog で追えます。"
      }
    ],
    toolsCardTitle: "ペースト以外のツール",
    toolsCardBody:
      "/tools ハブから、PDF、画像、データ、ZIP ワークフロー向けのクライアント側コンバーターとユーティリティを使えます。",
    currentSurfaceEyebrow: "現在のサーフェス",
    currentSurfaceTitle: "実運用のために作られた面",
    shippingNow: "提供中",
    quickLinksTitle: "クイックリンク",
    quickLinksPricing: "料金と課金",
    quickLinksDocs: "API とドキュメント",
    quickLinksBookmarkfs: "BookmarkFS companion",
    quickLinksQuickPaste: "クイックペースト",
    quickLinksFragment: "フラグメント共有",
    quickLinksClipboard: "クリップボードバケット",
    quickLinksHelp: "ヘルプと回答",
    quickLinksSupport: "サポート",
    quickLinksChangelog: "更新履歴",
    quickLinksTools: "ブラウザツール",
    quickLinksArchive: "公開アーカイブ",
    quickLinksForgotPassword: "パスワードを忘れた場合",
    recentChangesTitle: "最近の変更",
    readFullChangelog: "完全な更新履歴を読む",
    themesTitle: "テーマとアクセシビリティ",
    themesBody:
      "ペーストごとのシンタックスカラー切替、読みやすさを保つライトシェル、任意の高コントラスト表示、deep と balanced の背景モードを用意しています。",
    startHereTitle: "ここから開始",
    startHereBody:
      "ワークスペースを開き、ヘッダーの Tutorial ボタンから実際の操作に沿った案内を確認してください。その後、エディタで ? を押すと、クイックオープン、新規作成、保存、検索、置換などのショートカットを見られます。",
    footerApiDocs: "API と docs",
    footerTools: "ツール",
    footerTerms: "利用規約",
    footerPrivacy: "プライバシー"
  },
  es: {
    heroTitle: "Un espacio de trabajo para pastes, un hub de compartición rápida y una superficie lista para operar.",
    heroLeadStart: "Empieza en el ribbon workspace en",
    heroLeadMiddle:
      ", usa el tutorial integrado para aprender el diseño y luego pasa a rutas rápidas para enlaces secretos, clipboard buckets y compartición por fragmento cuando necesites un handoff más ágil. El companion del navegador vive en",
    heroLeadSupport: ", soporte en",
    heroLeadChangelog: " y el historial del producto en",
    heroLeadToolsEnabled: ". Las utilidades del navegador también están disponibles en",
    heroLeadToolsDisabled: ". La superficie de tools está temporalmente desactivada mientras termina de construirse. Mira",
    plansAndPricing: "planes y precios",
    tagline:
      "Un workspace de pastes local-first con rutas de compartición rápida, enlaces secretos, plantillas integradas, soporte interno y operaciones listas para administración.",
    marketingBullets: [
      "Workspace tipo ribbon con herramientas de formato, buscar/reemplazar, helpers JSON, impresión y plantillas integradas para cada lenguaje soportado",
      "Temas Prism, números de línea, vista previa Markdown, enlaces compartidos, exportación de código como imagen y pastes con múltiples archivos",
      "Quick paste, clipboard buckets, fragment-only sharing, URLs Pro personalizadas y enlaces secretos funcionan sobre la misma superficie alojada",
      "Borradores locales o sync con cuenta junto con carpetas, versiones, estrellas, comentarios, archivo público, API keys y flujos de BookmarkFS companion",
      "El onboarding inicial empieza con el megademo incluido y un tutorial guiado reabrible dentro del workspace",
      "Turnstile, rate limits, verificación por email, Google sign-in, tickets internos de soporte, moderación y operaciones de admin"
    ],
    comparePlans: "Comparar planes",
    viewChangelog: "Ver changelog",
    archiveLink: "Archivo",
    bookmarkfsLink: "BookmarkFS",
    quickPasteLink: "Pegado rápido",
    clipboardBucketsLink: "Clipboard buckets",
    toolsLink: "Tools",
    featureBadges: [
      "Editor ribbon y Prism",
      "Plantillas para cada lenguaje",
      "Pastes con varios archivos",
      "Enlaces secretos y URLs Pro personalizadas",
      "Quick paste y clipboard buckets",
      "Sincronización local + nube",
      "Tutorial guiado del workspace",
      "Tickets internos de soporte",
      "Admin y moderación",
      "Companion BookmarkFS",
      "Free · Pro · Team",
      "Hub de herramientas del navegador"
    ],
    featureCards: [
      {
        title: "Workspace tipo ribbon",
        body: "Pestañas Home, Insert, Layout y View con helpers de formato, listas, indentado, buscar/reemplazar, marcas de tiempo, fenced code, tablas, herramientas JSON, impresión y plantillas en una sola franja."
      },
      {
        title: "Editor consciente del código",
        body: "Temas Prism, números de línea, ajuste de texto, indentado con tab, resaltado de brackets y una capa de cursor transparente alineada con el resaltado."
      },
      {
        title: "Archivos y compartición",
        body: "Adjunta varios archivos por paste con lenguaje por archivo, vista previa Markdown, exportación de código como imagen y compartición pública, unlisted, secreta o con URL personalizada."
      },
      {
        title: "Modos y pulido",
        body: "Borradores locales en IndexedDB o sync con cuenta, carpetas, pines, apertura rápida, importación por URL, subidas por API, megademo inicial y tutorial reabrible."
      },
      {
        title: "Social y público",
        body: "Comentarios y estrellas en pastes compartidos, feed y archivo públicos, conteo visible de vistas, flujo de publicación anónima y visibilidad apta para moderación."
      },
      {
        title: "Confianza y cuentas",
        body: "Turnstile, rate limits, verificación por email, acceso con Google, reset de contraseña, control de sesiones y operaciones para admin y moderadores."
      },
      {
        title: "Superficies de quick-share",
        body: "Usa /quick para crear rápido, /clipboard para buckets temporales, /fragment para compartición solo en navegador y /s/[slug] para enlaces secretos fuera de superficies comunitarias."
      },
      {
        title: "Planes y recuperación",
        body: "Pricing resume Free, Pro y Team. Usa forgot password si te registraste con email y sigue los cambios del producto en el changelog."
      }
    ],
    toolsCardTitle: "Tools más allá de los pastes",
    toolsCardBody:
      "Convertidores y utilidades client-side para PDF, imágenes, datos, flujos ZIP y más desde el hub /tools.",
    currentSurfaceEyebrow: "Superficie actual",
    currentSurfaceTitle: "Construido para uso operativo real",
    shippingNow: "Disponible ahora",
    quickLinksTitle: "Enlaces rápidos",
    quickLinksPricing: "Precios y facturación",
    quickLinksDocs: "API y documentación",
    quickLinksBookmarkfs: "Companion BookmarkFS",
    quickLinksQuickPaste: "Quick paste",
    quickLinksFragment: "Fragment share",
    quickLinksClipboard: "Clipboard buckets",
    quickLinksHelp: "Ayuda y respuestas",
    quickLinksSupport: "Soporte",
    quickLinksChangelog: "Changelog",
    quickLinksTools: "Herramientas del navegador",
    quickLinksArchive: "Archivo público",
    quickLinksForgotPassword: "Olvidé mi contraseña",
    recentChangesTitle: "Cambios recientes",
    readFullChangelog: "Leer el changelog completo",
    themesTitle: "Temas y accesibilidad",
    themesBody:
      "Cambia colores de sintaxis por paste, usa una shell clara con buen contraste, activa chrome de alto contraste si quieres y alterna entre fondos deep o balanced.",
    startHereTitle: "Empieza aquí",
    startHereBody:
      "Abre el workspace y usa el botón Tutorial del encabezado para una guía sobre los controles reales. Luego pulsa ? en el editor para ver atajos como quick open, new paste, save, find y replace.",
    footerApiDocs: "API y docs",
    footerTools: "Tools",
    footerTerms: "Términos",
    footerPrivacy: "Privacidad"
  }
};
