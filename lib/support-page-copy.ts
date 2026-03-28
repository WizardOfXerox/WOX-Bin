import type { UiLanguage } from "@/lib/i18n";
import type { SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from "@/lib/support";

type SupportLandingCopy = {
  badge: string;
  eyebrow: string;
  title: string;
  description: string;
  signInCta: string;
  forgotPasswordCta: string;
  helpCta: string;
  handlesTitle: string;
  handlesItems: readonly string[];
  recoveryTitle: string;
  recoveryBody: string;
  oneThreadTitle: string;
  oneThreadBody: string;
  helpFirstTitle: string;
  helpFirstBody: string;
};

type SupportCenterCopy = {
  eyebrow: string;
  title: string;
  description: string;
  staffDashboardCta: string;
  newTicketTitle: string;
  newTicketDescription: string;
  subjectLabel: string;
  subjectPlaceholder: string;
  categoryLabel: string;
  relatedPasteLabel: string;
  relatedPastePlaceholder: string;
  detailsLabel: string;
  detailsPlaceholder: string;
  screenshotsLabel: string;
  screenshotsHint: string;
  attachmentGenericError: string;
  unsupportedFileType: (name: string) => string;
  fileTooLarge: (name: string) => string;
  fileReadError: (name: string) => string;
  fileParseError: (name: string) => string;
  createTicket: string;
  creatingTicket: string;
  createdTicket: string;
  createError: string;
  yourTicketsTitle: string;
  yourTicketsDescription: string;
  noTickets: string;
  ticketEyebrow: string;
  openedAt: (id: string, timestamp: string) => string;
  ownerLabel: string;
  unknownOwner: string;
  lastUpdateLabel: string;
  messagesLabel: string;
  relatedPasteMetaLabel: string;
  none: string;
  reopenTicket: string;
  closeTicket: string;
  updatingTicket: string;
  replyTitle: string;
  replyDescription: string;
  replyPlaceholder: string;
  attachImagesLabel: string;
  sendReply: string;
  sendingReply: string;
  replySent: string;
  replyError: string;
  selectTicketTitle: string;
  selectTicketDescription: string;
  actionError: string;
  removeAttachment: string;
  deletedUser: string;
  adminRole: string;
  moderatorRole: string;
  userRole: string;
  internalNote: string;
  messageCount: (count: number) => string;
  categoryLabels: Record<SupportTicketCategory, string>;
  priorityLabels: Record<SupportTicketPriority, string>;
  statusLabels: Record<SupportTicketStatus, string>;
};

export const SUPPORT_PAGE_COPY: Record<UiLanguage, SupportLandingCopy> = {
  en: {
    badge: "Support",
    eyebrow: "WOX-Bin",
    title: "Support now lives inside the app.",
    description:
      "Sign in to open tickets, attach screenshots, and keep a single thread with staff. If you cannot access your account, use password recovery first, then come back here after signing in.",
    signInCta: "Sign in to support",
    forgotPasswordCta: "Forgot password",
    helpCta: "Read Help",
    handlesTitle: "What support handles",
    handlesItems: [
      "Account lockouts, verification problems, or sign-in edge cases.",
      "Paste access problems, moderation appeals, and sharing mistakes.",
      "Bug reports with screenshots and reproducible steps."
    ],
    recoveryTitle: "Recovery first",
    recoveryBody:
      "Try reset password, account settings, or session cleanup first. The support queue is for issues that the app cannot resolve on its own.",
    oneThreadTitle: "One thread per issue",
    oneThreadBody:
      "Each ticket stays attached to your account and keeps screenshots, replies, and status updates in one place.",
    helpFirstTitle: "Help before queue",
    helpFirstBody: "The Help page covers the common answers. Use the support queue when you need manual action from staff."
  },
  fil: {
    badge: "Support",
    eyebrow: "WOX-Bin",
    title: "Nasa loob na ng app ang support.",
    description:
      "Mag-sign in para magbukas ng tickets, mag-attach ng screenshots, at panatilihin ang iisang thread kasama ang staff. Kung hindi mo ma-access ang account mo, gamitin muna ang password recovery bago bumalik dito pagkatapos mag-sign in.",
    signInCta: "Mag-sign in para sa support",
    forgotPasswordCta: "Nakalimutan ang password",
    helpCta: "Basahin ang Help",
    handlesTitle: "Ano ang hinahawakan ng support",
    handlesItems: [
      "Account lockouts, verification problems, o sign-in edge cases.",
      "Paste access problems, moderation appeals, at sharing mistakes.",
      "Bug reports na may screenshots at reproducible steps."
    ],
    recoveryTitle: "Recovery muna",
    recoveryBody:
      "Subukan muna ang reset password, account settings, o session cleanup. Ang support queue ay para sa mga issue na hindi naaayos ng app nang mag-isa.",
    oneThreadTitle: "Isang thread bawat issue",
    oneThreadBody:
      "Bawat ticket ay nakakabit sa account mo at pinapanatili ang screenshots, replies, at status updates sa iisang lugar.",
    helpFirstTitle: "Help bago queue",
    helpFirstBody: "Saklaw ng Help page ang mga karaniwang sagot. Gamitin ang support queue kapag kailangan mo na ng manual action mula sa staff."
  },
  ja: {
    badge: "サポート",
    eyebrow: "WOX-Bin",
    title: "サポートはアプリ内で完結します。",
    description:
      "サインインするとチケット作成、スクリーンショット添付、スタッフとの単一スレッド管理ができます。アカウントへ入れない場合は、まずパスワード再設定を行ってからここへ戻ってください。",
    signInCta: "サポートへサインイン",
    forgotPasswordCta: "パスワードを忘れた場合",
    helpCta: "ヘルプを読む",
    handlesTitle: "サポートが扱う内容",
    handlesItems: [
      "アカウントロック、認証問題、サインインの特殊ケース。",
      "ペーストアクセス問題、モデレーションへの異議申し立て、共有ミス。",
      "スクリーンショットと再現手順付きのバグ報告。"
    ],
    recoveryTitle: "まずは復旧",
    recoveryBody:
      "まずパスワード再設定、アカウント設定、セッションクリーンアップを試してください。support queue はアプリ単体で解決できない問題向けです。",
    oneThreadTitle: "問題ごとに 1 スレッド",
    oneThreadBody:
      "各チケットはアカウントに紐づき、スクリーンショット、返信、状態更新を一か所に保持します。",
    helpFirstTitle: "キューの前に Help",
    helpFirstBody: "よくある答えは Help ページにあります。スタッフの手動対応が必要なときに support queue を使ってください。"
  },
  es: {
    badge: "Soporte",
    eyebrow: "WOX-Bin",
    title: "El soporte ahora vive dentro de la app.",
    description:
      "Inicia sesión para abrir tickets, adjuntar capturas y mantener un solo hilo con el staff. Si no puedes acceder a tu cuenta, usa primero la recuperación de contraseña y vuelve aquí después de iniciar sesión.",
    signInCta: "Iniciar sesión para soporte",
    forgotPasswordCta: "Olvidé mi contraseña",
    helpCta: "Leer Ayuda",
    handlesTitle: "Qué maneja soporte",
    handlesItems: [
      "Bloqueos de cuenta, problemas de verificación o casos raros de inicio de sesión.",
      "Problemas de acceso a pastes, apelaciones de moderación y errores de compartición.",
      "Reportes de bugs con capturas y pasos reproducibles."
    ],
    recoveryTitle: "Primero recuperación",
    recoveryBody:
      "Prueba primero reset password, account settings o limpieza de sesiones. La cola de soporte es para problemas que la app no puede resolver sola.",
    oneThreadTitle: "Un hilo por problema",
    oneThreadBody:
      "Cada ticket queda unido a tu cuenta y mantiene capturas, respuestas y cambios de estado en un solo lugar.",
    helpFirstTitle: "Ayuda antes de la cola",
    helpFirstBody: "La página de Ayuda cubre las respuestas comunes. Usa la cola de soporte cuando necesites acción manual del staff."
  }
};

export const SUPPORT_CENTER_COPY: Record<UiLanguage, SupportCenterCopy> = {
  en: {
    eyebrow: "Support",
    title: "Internal ticketing",
    description:
      "Open a ticket for account problems, moderation disputes, paste issues, or bugs. Every reply stays attached to the same thread, and image attachments are supported for screenshots.",
    staffDashboardCta: "Open staff dashboard",
    newTicketTitle: "New ticket",
    newTicketDescription: "Start with the issue summary, then add details and screenshots.",
    subjectLabel: "Subject",
    subjectPlaceholder: "Example: Sign-in loop after password reset",
    categoryLabel: "Category",
    relatedPasteLabel: "Related paste slug",
    relatedPastePlaceholder: "Optional",
    detailsLabel: "Details",
    detailsPlaceholder: "Describe the issue, what you expected, what happened instead, and the exact error text if you have it.",
    screenshotsLabel: "Screenshots",
    screenshotsHint: "Up to 4 images. Max 3 MB each.",
    attachmentGenericError: "Could not load the selected image.",
    unsupportedFileType: (name) => `Unsupported file type: ${name}`,
    fileTooLarge: (name) => `${name} is too large. Max image size is 3 MB.`,
    fileReadError: (name) => `Could not read ${name}.`,
    fileParseError: (name) => `Could not parse ${name}.`,
    createTicket: "Create ticket",
    creatingTicket: "Creating…",
    createdTicket: "Support ticket created.",
    createError: "Could not create support ticket.",
    yourTicketsTitle: "Your tickets",
    yourTicketsDescription: "Open, resolved, and closed threads stay here.",
    noTickets: "No tickets yet.",
    ticketEyebrow: "Ticket",
    openedAt: (id, timestamp) => `#${id} opened ${timestamp}`,
    ownerLabel: "Owner",
    unknownOwner: "Unknown user",
    lastUpdateLabel: "Last update",
    messagesLabel: "Messages",
    relatedPasteMetaLabel: "Related paste",
    none: "None",
    reopenTicket: "Reopen ticket",
    closeTicket: "Close ticket",
    updatingTicket: "Updating…",
    replyTitle: "Reply",
    replyDescription: "Add context, follow-up details, or screenshots.",
    replyPlaceholder: "Write your reply…",
    attachImagesLabel: "Attach images",
    sendReply: "Send reply",
    sendingReply: "Sending…",
    replySent: "Reply sent.",
    replyError: "Could not send support reply.",
    selectTicketTitle: "Select a ticket",
    selectTicketDescription: "Your message thread, screenshots, and ticket status will appear here.",
    actionError: "Could not update ticket.",
    removeAttachment: "Remove",
    deletedUser: "Deleted user",
    adminRole: "Admin",
    moderatorRole: "Moderator",
    userRole: "User",
    internalNote: "Internal note",
    messageCount: (count) => `${count} message${count === 1 ? "" : "s"}`,
    categoryLabels: {
      account: "Account",
      paste: "Paste",
      billing: "Billing",
      moderation: "Moderation",
      bug: "Bug",
      other: "Other"
    },
    priorityLabels: {
      low: "Low",
      normal: "Normal",
      high: "High",
      urgent: "Urgent"
    },
    statusLabels: {
      open: "Open",
      in_progress: "In progress",
      waiting_on_user: "Waiting on you",
      resolved: "Resolved",
      closed: "Closed"
    }
  },
  fil: {
    eyebrow: "Support",
    title: "Internal ticketing",
    description:
      "Magbukas ng ticket para sa account problems, moderation disputes, paste issues, o bugs. Lahat ng reply ay nananatili sa iisang thread, at suportado ang image attachments para sa screenshots.",
    staffDashboardCta: "Buksan ang staff dashboard",
    newTicketTitle: "Bagong ticket",
    newTicketDescription: "Magsimula sa buod ng issue, saka idagdag ang detalye at screenshots.",
    subjectLabel: "Paksa",
    subjectPlaceholder: "Halimbawa: Sign-in loop pagkatapos ng password reset",
    categoryLabel: "Category",
    relatedPasteLabel: "Related paste slug",
    relatedPastePlaceholder: "Opsyonal",
    detailsLabel: "Detalye",
    detailsPlaceholder: "Ilarawan ang issue, ano ang inaasahan mo, ano ang nangyari sa halip, at ang eksaktong error text kung meron.",
    screenshotsLabel: "Screenshots",
    screenshotsHint: "Hanggang 4 na larawan. Max 3 MB bawat isa.",
    attachmentGenericError: "Hindi ma-load ang napiling larawan.",
    unsupportedFileType: (name) => `Hindi suportadong file type: ${name}`,
    fileTooLarge: (name) => `${name} ay masyadong malaki. Ang max na laki ng image ay 3 MB.`,
    fileReadError: (name) => `Hindi mabasa ang ${name}.`,
    fileParseError: (name) => `Hindi ma-parse ang ${name}.`,
    createTicket: "Gumawa ng ticket",
    creatingTicket: "Gumagawa…",
    createdTicket: "Nagawa ang support ticket.",
    createError: "Hindi magawa ang support ticket.",
    yourTicketsTitle: "Mga ticket mo",
    yourTicketsDescription: "Dito nananatili ang open, resolved, at closed threads.",
    noTickets: "Wala pang tickets.",
    ticketEyebrow: "Ticket",
    openedAt: (id, timestamp) => `#${id} binuksan ${timestamp}`,
    ownerLabel: "May-ari",
    unknownOwner: "Hindi kilalang user",
    lastUpdateLabel: "Huling update",
    messagesLabel: "Mga mensahe",
    relatedPasteMetaLabel: "Kaugnay na paste",
    none: "Wala",
    reopenTicket: "Buksan muli ang ticket",
    closeTicket: "Isara ang ticket",
    updatingTicket: "Ina-update…",
    replyTitle: "Reply",
    replyDescription: "Magdagdag ng context, follow-up details, o screenshots.",
    replyPlaceholder: "Isulat ang reply mo…",
    attachImagesLabel: "Mag-attach ng images",
    sendReply: "Ipadala ang reply",
    sendingReply: "Ipinapadala…",
    replySent: "Naipadala ang reply.",
    replyError: "Hindi maipadala ang support reply.",
    selectTicketTitle: "Pumili ng ticket",
    selectTicketDescription: "Lalabas dito ang message thread, screenshots, at status ng ticket mo.",
    actionError: "Hindi ma-update ang ticket.",
    removeAttachment: "Alisin",
    deletedUser: "Naburang user",
    adminRole: "Admin",
    moderatorRole: "Moderator",
    userRole: "User",
    internalNote: "Internal note",
    messageCount: (count) => `${count} mensahe`,
    categoryLabels: {
      account: "Account",
      paste: "Paste",
      billing: "Billing",
      moderation: "Moderation",
      bug: "Bug",
      other: "Iba pa"
    },
    priorityLabels: {
      low: "Mababa",
      normal: "Normal",
      high: "Mataas",
      urgent: "Urgent"
    },
    statusLabels: {
      open: "Bukas",
      in_progress: "Inaayos",
      waiting_on_user: "Naghihintay sa iyo",
      resolved: "Resolved",
      closed: "Sarado"
    }
  },
  ja: {
    eyebrow: "サポート",
    title: "内部チケット管理",
    description:
      "アカウント問題、モデレーション異議、ペースト障害、バグのためのチケットを作成できます。返信はすべて同じスレッドに残り、スクリーンショット用の画像添付にも対応します。",
    staffDashboardCta: "スタッフダッシュボードを開く",
    newTicketTitle: "新しいチケット",
    newTicketDescription: "まず問題の要約を書き、そのあと詳細とスクリーンショットを追加してください。",
    subjectLabel: "件名",
    subjectPlaceholder: "例: パスワード再設定後にサインインループする",
    categoryLabel: "カテゴリ",
    relatedPasteLabel: "関連 paste slug",
    relatedPastePlaceholder: "任意",
    detailsLabel: "詳細",
    detailsPlaceholder: "問題の内容、期待した動作、実際に起きたこと、分かるなら正確なエラー文を書いてください。",
    screenshotsLabel: "スクリーンショット",
    screenshotsHint: "最大 4 枚、各 3 MB まで。",
    attachmentGenericError: "選択した画像を読み込めませんでした。",
    unsupportedFileType: (name) => `未対応のファイル形式です: ${name}`,
    fileTooLarge: (name) => `${name} は大きすぎます。画像は最大 3 MB です。`,
    fileReadError: (name) => `${name} を読み込めませんでした。`,
    fileParseError: (name) => `${name} を解析できませんでした。`,
    createTicket: "チケットを作成",
    creatingTicket: "作成中…",
    createdTicket: "サポートチケットを作成しました。",
    createError: "サポートチケットを作成できませんでした。",
    yourTicketsTitle: "あなたのチケット",
    yourTicketsDescription: "open、resolved、closed のスレッドがここに残ります。",
    noTickets: "まだチケットはありません。",
    ticketEyebrow: "チケット",
    openedAt: (id, timestamp) => `#${id} を ${timestamp} に作成`,
    ownerLabel: "所有者",
    unknownOwner: "不明なユーザー",
    lastUpdateLabel: "最終更新",
    messagesLabel: "メッセージ",
    relatedPasteMetaLabel: "関連ペースト",
    none: "なし",
    reopenTicket: "チケットを再開",
    closeTicket: "チケットを閉じる",
    updatingTicket: "更新中…",
    replyTitle: "返信",
    replyDescription: "補足情報、追記、スクリーンショットを追加できます。",
    replyPlaceholder: "返信を書いてください…",
    attachImagesLabel: "画像を添付",
    sendReply: "返信を送信",
    sendingReply: "送信中…",
    replySent: "返信を送信しました。",
    replyError: "サポート返信を送信できませんでした。",
    selectTicketTitle: "チケットを選択",
    selectTicketDescription: "メッセージスレッド、スクリーンショット、チケット状態がここに表示されます。",
    actionError: "チケットを更新できませんでした。",
    removeAttachment: "削除",
    deletedUser: "削除されたユーザー",
    adminRole: "管理者",
    moderatorRole: "モデレーター",
    userRole: "ユーザー",
    internalNote: "内部メモ",
    messageCount: (count) => `${count} 件のメッセージ`,
    categoryLabels: {
      account: "アカウント",
      paste: "ペースト",
      billing: "課金",
      moderation: "モデレーション",
      bug: "バグ",
      other: "その他"
    },
    priorityLabels: {
      low: "低",
      normal: "通常",
      high: "高",
      urgent: "緊急"
    },
    statusLabels: {
      open: "Open",
      in_progress: "進行中",
      waiting_on_user: "あなた待ち",
      resolved: "解決済み",
      closed: "終了"
    }
  },
  es: {
    eyebrow: "Soporte",
    title: "Ticketing interno",
    description:
      "Abre un ticket por problemas de cuenta, disputas de moderación, fallos con pastes o bugs. Cada respuesta queda en el mismo hilo y se admiten imágenes para capturas.",
    staffDashboardCta: "Abrir panel del staff",
    newTicketTitle: "Nuevo ticket",
    newTicketDescription: "Empieza con el resumen del problema y luego añade detalles y capturas.",
    subjectLabel: "Asunto",
    subjectPlaceholder: "Ejemplo: bucle de inicio después de restablecer contraseña",
    categoryLabel: "Categoría",
    relatedPasteLabel: "Slug del paste relacionado",
    relatedPastePlaceholder: "Opcional",
    detailsLabel: "Detalles",
    detailsPlaceholder: "Describe el problema, qué esperabas, qué ocurrió en su lugar y el texto exacto del error si lo tienes.",
    screenshotsLabel: "Capturas",
    screenshotsHint: "Hasta 4 imágenes. Máximo 3 MB cada una.",
    attachmentGenericError: "No se pudo cargar la imagen seleccionada.",
    unsupportedFileType: (name) => `Tipo de archivo no compatible: ${name}`,
    fileTooLarge: (name) => `${name} es demasiado grande. El tamaño máximo de imagen es 3 MB.`,
    fileReadError: (name) => `No se pudo leer ${name}.`,
    fileParseError: (name) => `No se pudo procesar ${name}.`,
    createTicket: "Crear ticket",
    creatingTicket: "Creando…",
    createdTicket: "Ticket de soporte creado.",
    createError: "No se pudo crear el ticket de soporte.",
    yourTicketsTitle: "Tus tickets",
    yourTicketsDescription: "Aquí se quedan los hilos abiertos, resueltos y cerrados.",
    noTickets: "Todavía no hay tickets.",
    ticketEyebrow: "Ticket",
    openedAt: (id, timestamp) => `#${id} abierto ${timestamp}`,
    ownerLabel: "Propietario",
    unknownOwner: "Usuario desconocido",
    lastUpdateLabel: "Última actualización",
    messagesLabel: "Mensajes",
    relatedPasteMetaLabel: "Paste relacionado",
    none: "Ninguno",
    reopenTicket: "Reabrir ticket",
    closeTicket: "Cerrar ticket",
    updatingTicket: "Actualizando…",
    replyTitle: "Respuesta",
    replyDescription: "Añade contexto, seguimiento o capturas.",
    replyPlaceholder: "Escribe tu respuesta…",
    attachImagesLabel: "Adjuntar imágenes",
    sendReply: "Enviar respuesta",
    sendingReply: "Enviando…",
    replySent: "Respuesta enviada.",
    replyError: "No se pudo enviar la respuesta de soporte.",
    selectTicketTitle: "Selecciona un ticket",
    selectTicketDescription: "Aquí aparecerán tu hilo de mensajes, capturas y estado del ticket.",
    actionError: "No se pudo actualizar el ticket.",
    removeAttachment: "Quitar",
    deletedUser: "Usuario eliminado",
    adminRole: "Admin",
    moderatorRole: "Moderador",
    userRole: "Usuario",
    internalNote: "Nota interna",
    messageCount: (count) => `${count} mensaje${count === 1 ? "" : "s"}`,
    categoryLabels: {
      account: "Cuenta",
      paste: "Paste",
      billing: "Facturación",
      moderation: "Moderación",
      bug: "Bug",
      other: "Otro"
    },
    priorityLabels: {
      low: "Baja",
      normal: "Normal",
      high: "Alta",
      urgent: "Urgente"
    },
    statusLabels: {
      open: "Abierto",
      in_progress: "En progreso",
      waiting_on_user: "Esperando tu respuesta",
      resolved: "Resuelto",
      closed: "Cerrado"
    }
  }
};
