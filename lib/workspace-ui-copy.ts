import type { UiLanguage } from "@/lib/i18n";

type WorkspaceUiCopy = {
  libraryEyebrow: string;
  pastesTitle: string;
  newPaste: string;
  searchPlaceholder: string;
  folders: string;
  all: string;
  publicFeed: string;
  libraryFolders: string;
  allPastes: string;
  showAllPastes: string;
  newFolder: string;
  selected: (count: number) => string;
  move: string;
  delete: string;
  clear: string;
  selectVisible: string;
  clearSelection: string;
  sortAndFilter: string;
  pinnedOnly: string;
  sortPinnedUpdated: string;
  sortUpdated: string;
  sortNewest: string;
  sortOldest: string;
  sortTitle: string;
  everything: string;
  favorites: string;
  recent: string;
  archived: string;
  loadingWorkspace: string;
  loadingPublicFeed: string;
  noPublicPastes: string;
  noPastesMatch: string;
  importFile: string;
  export: string;
  importJsonLabel: string;
  importTextLabel: string;
  importDragDropLabel: string;
  emptyTitle: string;
  emptyBody: string;
  createPaste: string;
  libraryButton: string;
  detailsButton: string;
  workspaceLibraryTitle: string;
  workspaceLibraryDescription: string;
  pasteDetailsTitle: string;
  pasteDetailsDescription: string;
  folderActionsTitle: string;
  folderActionsAllTitle: string;
  folderActionsAllDescription: string;
  folderActionsFolderDescription: string;
  copyFolderName: string;
  filterToThisFolder: string;
};

export const WORKSPACE_UI_COPY: Record<UiLanguage, WorkspaceUiCopy> = {
  en: {
    libraryEyebrow: "Library",
    pastesTitle: "Pastes",
    newPaste: "New",
    searchPlaceholder: "Search title, content, or tags",
    folders: "Folders",
    all: "All",
    publicFeed: "Public feed",
    libraryFolders: "Library folders",
    allPastes: "All pastes",
    showAllPastes: "Show all pastes",
    newFolder: "New folder…",
    selected: (count) => `${count} selected`,
    move: "Move…",
    delete: "Delete",
    clear: "Clear",
    selectVisible: "Select visible",
    clearSelection: "Clear selection",
    sortAndFilter: "Sort & filter",
    pinnedOnly: "Pinned only",
    sortPinnedUpdated: "Pinned first, by last update",
    sortUpdated: "By last update",
    sortNewest: "Newest created",
    sortOldest: "Oldest created",
    sortTitle: "Title A–Z",
    everything: "Everything",
    favorites: "Favorites",
    recent: "Recent",
    archived: "Archived",
    loadingWorkspace: "Loading workspace...",
    loadingPublicFeed: "Loading public feed…",
    noPublicPastes: "No public pastes to show yet.",
    noPastesMatch: "No pastes match the current search. Start with a new draft or import a text file / workspace JSON export.",
    importFile: "Import file",
    export: "Export",
    importJsonLabel: "JSON backup",
    importTextLabel: ".txt, .md, code",
    importDragDropLabel: "Drag & drop",
    emptyTitle: "Nothing selected yet",
    emptyBody: "Start a new paste, import your existing archive, or sign in to sync everything to the hosted workspace.",
    createPaste: "Create a paste",
    libraryButton: "Library",
    detailsButton: "Details",
    workspaceLibraryTitle: "Workspace library",
    workspaceLibraryDescription: "Browse, filter, import, and open pastes from your workspace library.",
    pasteDetailsTitle: "Paste details",
    pasteDetailsDescription: "Manage language, folder, sharing, versions, and advanced settings for the current paste.",
    folderActionsTitle: "Folder actions",
    folderActionsAllTitle: "All pastes",
    folderActionsAllDescription: "Quick actions for your full workspace library.",
    folderActionsFolderDescription: "Manage this folder without needing desktop right-click.",
    copyFolderName: "Copy folder name",
    filterToThisFolder: "Filter to this folder"
  },
  fil: {
    libraryEyebrow: "Library",
    pastesTitle: "Mga paste",
    newPaste: "Bago",
    searchPlaceholder: "Hanapin sa title, content, o tags",
    folders: "Folders",
    all: "Lahat",
    publicFeed: "Public feed",
    libraryFolders: "Mga folder ng library",
    allPastes: "Lahat ng paste",
    showAllPastes: "Ipakita lahat ng paste",
    newFolder: "Bagong folder…",
    selected: (count) => `${count} napili`,
    move: "Ilipat…",
    delete: "Burahin",
    clear: "I-clear",
    selectVisible: "Piliin ang nakikita",
    clearSelection: "I-clear ang selection",
    sortAndFilter: "Sort at filter",
    pinnedOnly: "Pinned lang",
    sortPinnedUpdated: "Pinned muna, ayon sa huling update",
    sortUpdated: "Ayon sa huling update",
    sortNewest: "Pinakabagong gawa",
    sortOldest: "Pinakalumang gawa",
    sortTitle: "Pamagat A–Z",
    everything: "Lahat",
    favorites: "Paborito",
    recent: "Kamakailan",
    archived: "Archived",
    loadingWorkspace: "Naglo-load ang workspace...",
    loadingPublicFeed: "Naglo-load ang public feed…",
    noPublicPastes: "Wala pang public pastes na maipapakita.",
    noPastesMatch: "Walang tumugmang paste sa kasalukuyang search. Magsimula sa bagong draft o mag-import ng text file / workspace JSON export.",
    importFile: "Mag-import ng file",
    export: "I-export",
    importJsonLabel: "JSON backup",
    importTextLabel: ".txt, .md, code",
    importDragDropLabel: "Drag & drop",
    emptyTitle: "Wala pang napili",
    emptyBody: "Gumawa ng bagong paste, i-import ang archive mo, o mag-sign in para mai-sync ang lahat sa hosted workspace.",
    createPaste: "Gumawa ng paste",
    libraryButton: "Library",
    detailsButton: "Details",
    workspaceLibraryTitle: "Library ng workspace",
    workspaceLibraryDescription: "Mag-browse, mag-filter, mag-import, at magbukas ng mga paste mula sa workspace library.",
    pasteDetailsTitle: "Detalye ng paste",
    pasteDetailsDescription: "Pamahalaan ang language, folder, sharing, versions, at advanced settings ng kasalukuyang paste.",
    folderActionsTitle: "Mga aksyon sa folder",
    folderActionsAllTitle: "Lahat ng paste",
    folderActionsAllDescription: "Mabilis na aksyon para sa buong workspace library mo.",
    folderActionsFolderDescription: "Pamahalaan ang folder na ito kahit walang desktop right-click.",
    copyFolderName: "Kopyahin ang folder name",
    filterToThisFolder: "I-filter sa folder na ito"
  },
  ja: {
    libraryEyebrow: "ライブラリ",
    pastesTitle: "ペースト",
    newPaste: "新規",
    searchPlaceholder: "タイトル、本文、タグを検索",
    folders: "フォルダ",
    all: "すべて",
    publicFeed: "公開フィード",
    libraryFolders: "ライブラリフォルダ",
    allPastes: "すべてのペースト",
    showAllPastes: "すべてのペーストを表示",
    newFolder: "新しいフォルダ…",
    selected: (count) => `${count} 件選択中`,
    move: "移動…",
    delete: "削除",
    clear: "クリア",
    selectVisible: "表示中を選択",
    clearSelection: "選択を解除",
    sortAndFilter: "並び替えとフィルター",
    pinnedOnly: "ピン留めのみ",
    sortPinnedUpdated: "ピン留め優先、更新順",
    sortUpdated: "更新順",
    sortNewest: "新しい作成順",
    sortOldest: "古い作成順",
    sortTitle: "タイトル A–Z",
    everything: "すべて",
    favorites: "お気に入り",
    recent: "最近",
    archived: "アーカイブ",
    loadingWorkspace: "ワークスペースを読み込み中...",
    loadingPublicFeed: "公開フィードを読み込み中…",
    noPublicPastes: "表示できる公開ペーストはまだありません。",
    noPastesMatch: "現在の検索条件に一致するペーストがありません。新しい下書きを作成するか、テキストファイル / ワークスペース JSON を取り込んでください。",
    importFile: "ファイルを取り込む",
    export: "書き出し",
    importJsonLabel: "JSON バックアップ",
    importTextLabel: ".txt, .md, code",
    importDragDropLabel: "ドラッグ＆ドロップ",
    emptyTitle: "まだ何も選択されていません",
    emptyBody: "新しいペーストを作成するか、既存のアーカイブを取り込むか、サインインしてホスト側ワークスペースへ同期してください。",
    createPaste: "ペーストを作成",
    libraryButton: "ライブラリ",
    detailsButton: "詳細",
    workspaceLibraryTitle: "ワークスペースライブラリ",
    workspaceLibraryDescription: "ワークスペースのペーストを閲覧、絞り込み、取り込み、開くことができます。",
    pasteDetailsTitle: "ペースト詳細",
    pasteDetailsDescription: "現在のペーストの言語、フォルダ、共有、バージョン、高度な設定を管理します。",
    folderActionsTitle: "フォルダ操作",
    folderActionsAllTitle: "すべてのペースト",
    folderActionsAllDescription: "ワークスペース全体に対するクイック操作です。",
    folderActionsFolderDescription: "デスクトップの右クリックなしでこのフォルダを管理します。",
    copyFolderName: "フォルダ名をコピー",
    filterToThisFolder: "このフォルダで絞り込む"
  },
  es: {
    libraryEyebrow: "Biblioteca",
    pastesTitle: "Pastes",
    newPaste: "Nuevo",
    searchPlaceholder: "Buscar por título, contenido o tags",
    folders: "Carpetas",
    all: "Todo",
    publicFeed: "Feed público",
    libraryFolders: "Carpetas de la biblioteca",
    allPastes: "Todos los pastes",
    showAllPastes: "Mostrar todos los pastes",
    newFolder: "Nueva carpeta…",
    selected: (count) => `${count} seleccionado${count === 1 ? "" : "s"}`,
    move: "Mover…",
    delete: "Eliminar",
    clear: "Limpiar",
    selectVisible: "Seleccionar visibles",
    clearSelection: "Limpiar selección",
    sortAndFilter: "Ordenar y filtrar",
    pinnedOnly: "Solo fijados",
    sortPinnedUpdated: "Fijados primero, por última actualización",
    sortUpdated: "Por última actualización",
    sortNewest: "Más nuevos",
    sortOldest: "Más antiguos",
    sortTitle: "Título A–Z",
    everything: "Todo",
    favorites: "Favoritos",
    recent: "Recientes",
    archived: "Archivados",
    loadingWorkspace: "Cargando workspace...",
    loadingPublicFeed: "Cargando feed público…",
    noPublicPastes: "Todavía no hay pastes públicos para mostrar.",
    noPastesMatch: "Ningún paste coincide con la búsqueda actual. Empieza con un borrador nuevo o importa un archivo de texto / export JSON del workspace.",
    importFile: "Importar archivo",
    export: "Exportar",
    importJsonLabel: "JSON backup",
    importTextLabel: ".txt, .md, code",
    importDragDropLabel: "Arrastrar y soltar",
    emptyTitle: "Todavía no hay nada seleccionado",
    emptyBody: "Crea un paste nuevo, importa tu archivo existente o inicia sesión para sincronizarlo todo con el workspace alojado.",
    createPaste: "Crear un paste",
    libraryButton: "Biblioteca",
    detailsButton: "Detalles",
    workspaceLibraryTitle: "Biblioteca del workspace",
    workspaceLibraryDescription: "Explora, filtra, importa y abre pastes desde la biblioteca de tu workspace.",
    pasteDetailsTitle: "Detalles del paste",
    pasteDetailsDescription: "Gestiona lenguaje, carpeta, compartición, versiones y ajustes avanzados del paste actual.",
    folderActionsTitle: "Acciones de carpeta",
    folderActionsAllTitle: "Todos los pastes",
    folderActionsAllDescription: "Acciones rápidas para toda tu biblioteca del workspace.",
    folderActionsFolderDescription: "Gestiona esta carpeta sin depender del clic derecho de escritorio.",
    copyFolderName: "Copiar nombre de carpeta",
    filterToThisFolder: "Filtrar por esta carpeta"
  }
};
