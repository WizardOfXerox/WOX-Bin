import type { UiLanguage } from "@/lib/i18n";

type PublicPasteCopy = {
  publicEyebrow: string;
  secretEyebrow: string;
  anonymous: string;
  untrustedHtmlRiskTitle: string;
  untrustedHtmlRiskBody: string;
  untrustedHtmlRiskFooter: string;
  updatedViews: (date: string, views: number) => string;
  secretLead: string;
  visibilityBadgePublic: string;
  visibilityBadgeUnlisted: string;
  visibilityBadgePrivate: string;
  secretModeBadge: string;
  passwordProtectedBadge: string;
  captchaRequiredBadge: string;
  burnAfterReadBadge: string;
  burnAfterViewsBadge: (views: number) => string;
  share: string;
  copyLink: string;
  copyRawLink: string;
  fork: string;
  forkTitle: string;
  print: string;
  codeImage: string;
  codeImageLockedTitle: string;
  codeImageReadyTitle: string;
  shareDialogText: (eyebrow: string) => string;
  download: string;
  downloadRaw: string;
  raw: string;
  star: string;
  starred: string;
  verificationRequired: string;
  passwordRequired: string;
  verificationDescription: string;
  passwordDescription: string;
  passwordPlaceholder: string;
  verifyAndContinue: string;
  unlockPaste: string;
  verifying: string;
  unlocking: string;
  unlockCaptchaStepUp: string;
  unlockGenericError: string;
  codeView: string;
  source: string;
  preview: string;
  lineNumbers: string;
  lineGuides: string;
  wordWrap: string;
  renderingPreview: string;
  nothingToPreview: string;
  attachedFiles: string;
  attachedFilesDescription: string;
  attachmentDisplayError: string;
  discussionEyebrow: string;
  commentsTitle: string;
  messages: (count: number) => string;
  secretNoComments: string;
  unlockToComments: string;
  noComments: string;
  replyingTo: (author: string) => string;
  cancelReply: string;
  reply: string;
  replyPlaceholder: string;
  commentPlaceholder: string;
  postingComment: string;
  commentGenericError: string;
  postReply: string;
  postComment: string;
  signInToJoin: string;
  imageKind: string;
  videoKind: string;
  metadataEyebrow: string;
  shareDetailsTitle: string;
  slugLabel: string;
  visibilityLabel: string;
  visibilitySecret: string;
  visibilityPublic: string;
  visibilityUnlisted: string;
  visibilityPrivate: string;
  activityLabel: string;
  activitySecret: (views: number) => string;
  activityPublic: (comments: number, stars: number) => string;
  moderationEyebrow: string;
  moderationBody: string;
  reportSending: string;
  reportGenericError: string;
  reportSubmitted: string;
  hideReportForm: string;
  report: string;
  defaultReportReason: string;
  reasonPlaceholder: string;
  notesPlaceholder: string;
  submitReport: string;
};

export const PUBLIC_PASTE_COPY: Record<UiLanguage, PublicPasteCopy> = {
  en: {
    publicEyebrow: "Public paste",
    secretEyebrow: "Secret link",
    anonymous: "Anonymous",
    untrustedHtmlRiskTitle: "Untrusted HTML risk.",
    untrustedHtmlRiskBody:
      "This preview allows scripts, forms, popups, and same-origin access — malicious pastes could phish or use your session. Use only for content you trust.",
    untrustedHtmlRiskFooter:
      "Top-level navigation is limited to user gestures; other sandbox escapes may still be possible — treat every paste as code you are executing.",
    updatedViews: (date, views) => `Updated ${date}. ${views.toLocaleString()} view${views === 1 ? "" : "s"}.`,
    secretLead: "This link stays out of the public archive and disables comments and stars.",
    visibilityBadgePublic: "public",
    visibilityBadgeUnlisted: "unlisted",
    visibilityBadgePrivate: "private",
    secretModeBadge: "Secret mode",
    passwordProtectedBadge: "Password protected",
    captchaRequiredBadge: "CAPTCHA required",
    burnAfterReadBadge: "Burn after read",
    burnAfterViewsBadge: (views) => `Burn after ${views} view${views === 1 ? "" : "s"}`,
    share: "Share",
    copyLink: "Copy link",
    copyRawLink: "Copy raw link",
    fork: "Fork",
    forkTitle: "Open workspace with a fork of this paste",
    print: "Print",
    codeImage: "Code image",
    codeImageLockedTitle: "Unlock the paste to export code as an image",
    codeImageReadyTitle: "Export code as an image",
    shareDialogText: (eyebrow) => `${eyebrow} on WOX-Bin`,
    download: "Download",
    downloadRaw: "Download raw",
    raw: "Raw",
    star: "Star",
    starred: "Starred",
    verificationRequired: "Human verification required",
    passwordRequired: "Password required",
    verificationDescription: "This paste requires a Turnstile challenge before the content and comments are shown.",
    passwordDescription: "This paste is protected. Enter the password to view the content and comments.",
    passwordPlaceholder: "Paste password",
    verifyAndContinue: "Verify and continue",
    unlockPaste: "Unlock paste",
    verifying: "Verifying...",
    unlocking: "Unlocking...",
    unlockCaptchaStepUp: "CAPTCHA complete. Enter the paste password to continue.",
    unlockGenericError: "Could not unlock paste.",
    codeView: "Code view",
    source: "Source",
    preview: "Preview",
    lineNumbers: "Line numbers",
    lineGuides: "Line guides",
    wordWrap: "Wrap long lines",
    renderingPreview: "Rendering preview...",
    nothingToPreview: "Nothing to preview.",
    attachedFiles: "Attached files",
    attachedFilesDescription: "Multi-file pastes stay grouped together so shared snippets keep their context.",
    attachmentDisplayError: "This attachment could not be displayed.",
    discussionEyebrow: "Discussion",
    commentsTitle: "Comments",
    messages: (count) => `${count} message${count === 1 ? "" : "s"}`,
    secretNoComments: "Secret links do not support public comments or stars.",
    unlockToComments: "Unlock the paste to read or post comments.",
    noComments: "No comments yet. The first reply usually sets the tone.",
    replyingTo: (author) => `Replying to ${author}`,
    cancelReply: "Cancel reply",
    reply: "Reply",
    replyPlaceholder: "Reply to {author}",
    commentPlaceholder: "Add a thoughtful comment",
    postingComment: "Posting...",
    commentGenericError: "Could not post comment.",
    postReply: "Post reply",
    postComment: "Post comment",
    signInToJoin: "Sign in to join the discussion or star this paste.",
    imageKind: "image",
    videoKind: "video",
    metadataEyebrow: "Metadata",
    shareDetailsTitle: "Share details",
    slugLabel: "Slug",
    visibilityLabel: "Visibility",
    visibilitySecret:
      "Secret link mode. Hidden from archive, feed, comments, and stars. The payload is still stored server-side unless the author used fragment sharing.",
    visibilityPublic: "Listed in the public feed.",
    visibilityUnlisted: "Available by direct link only.",
    visibilityPrivate: "Visible only to the owner and moderators.",
    activityLabel: "Activity",
    activitySecret: (views) => `${views.toLocaleString()} view${views === 1 ? "" : "s"} tracked. Comments and stars are disabled.`,
    activityPublic: (comments, stars) => `${comments} comments and ${stars} stars.`,
    moderationEyebrow: "Moderation",
    moderationBody: "Flag content that should be reviewed by moderators.",
    reportSending: "Sending report...",
    reportGenericError: "Could not submit report.",
    reportSubmitted: "Report submitted. Thanks for helping keep the feed clean.",
    hideReportForm: "Hide form",
    report: "Report",
    defaultReportReason: "Spam",
    reasonPlaceholder: "Reason",
    notesPlaceholder: "Optional notes for moderators",
    submitReport: "Submit report"
  },
  fil: {
    publicEyebrow: "Public paste",
    secretEyebrow: "Secret link",
    anonymous: "Anonymous",
    untrustedHtmlRiskTitle: "Panganib ng hindi pinagkakatiwalaang HTML.",
    untrustedHtmlRiskBody:
      "Pinapayagan ng preview na ito ang scripts, forms, popups, at same-origin access — puwedeng gamitin ng malicious pastes ang session mo o manlinlang. Gamitin lang ito sa content na pinagkakatiwalaan mo.",
    untrustedHtmlRiskFooter:
      "Nililimitahan ang top-level navigation sa user gestures, pero may iba pang posibleng sandbox escapes — ituring ang bawat paste na parang code na pinapatakbo mo.",
    updatedViews: (date, views) => `Na-update ${date}. ${views.toLocaleString()} view${views === 1 ? "" : "s"}.`,
    secretLead: "Hindi ito lalabas sa public archive at naka-disable ang comments at stars.",
    visibilityBadgePublic: "public",
    visibilityBadgeUnlisted: "unlisted",
    visibilityBadgePrivate: "private",
    secretModeBadge: "Secret mode",
    passwordProtectedBadge: "May password",
    captchaRequiredBadge: "Kailangan ng CAPTCHA",
    burnAfterReadBadge: "Burn after read",
    burnAfterViewsBadge: (views) => `Burn after ${views} view${views === 1 ? "" : "s"}`,
    share: "I-share",
    copyLink: "Kopyahin ang link",
    copyRawLink: "Kopyahin ang raw link",
    fork: "Fork",
    forkTitle: "Buksan ang workspace na may fork ng paste na ito",
    print: "I-print",
    codeImage: "Code image",
    codeImageLockedTitle: "I-unlock ang paste para ma-export bilang image",
    codeImageReadyTitle: "I-export ang code bilang image",
    shareDialogText: (eyebrow) => `${eyebrow} sa WOX-Bin`,
    download: "I-download",
    downloadRaw: "I-download ang raw",
    raw: "Raw",
    star: "Star",
    starred: "Starred",
    verificationRequired: "Kailangan ng human verification",
    passwordRequired: "Kailangan ng password",
    verificationDescription: "Kailangan ng Turnstile challenge bago ipakita ang content at comments ng paste na ito.",
    passwordDescription: "Protektado ang paste na ito. Ilagay ang password para makita ang content at comments.",
    passwordPlaceholder: "Password ng paste",
    verifyAndContinue: "I-verify at magpatuloy",
    unlockPaste: "I-unlock ang paste",
    verifying: "Bine-verify...",
    unlocking: "Ina-unlock...",
    unlockCaptchaStepUp: "Tapos na ang CAPTCHA. Ilagay ang password ng paste para magpatuloy.",
    unlockGenericError: "Hindi ma-unlock ang paste.",
    codeView: "Code view",
    source: "Source",
    preview: "Preview",
    lineNumbers: "Line numbers",
    lineGuides: "Line guides",
    wordWrap: "Wrap long lines",
    renderingPreview: "Binubuo ang preview...",
    nothingToPreview: "Walang maipakitang preview.",
    attachedFiles: "Attached files",
    attachedFilesDescription: "Magkakasama ang multi-file pastes para manatili ang context ng shared snippets.",
    attachmentDisplayError: "Hindi maipakita ang attachment na ito.",
    discussionEyebrow: "Usapan",
    commentsTitle: "Comments",
    messages: (count) => `${count} mensahe`,
    secretNoComments: "Walang public comments o stars ang secret links.",
    unlockToComments: "I-unlock ang paste para makabasa o makapag-post ng comments.",
    noComments: "Wala pang comments. Karaniwan, ang unang reply ang nagtatakda ng tono.",
    replyingTo: (author) => `Sumasagot kay ${author}`,
    cancelReply: "Kanselahin ang reply",
    reply: "Reply",
    replyPlaceholder: "Sumagot kay {author}",
    commentPlaceholder: "Magdagdag ng maayos na comment",
    postingComment: "Nagpo-post...",
    commentGenericError: "Hindi maipost ang comment.",
    postReply: "I-post ang reply",
    postComment: "I-post ang comment",
    signInToJoin: "Mag-sign in para sumali sa usapan o mag-star sa paste na ito.",
    imageKind: "image",
    videoKind: "video",
    metadataEyebrow: "Metadata",
    shareDetailsTitle: "Detalye ng share",
    slugLabel: "Slug",
    visibilityLabel: "Visibility",
    visibilitySecret:
      "Secret link mode. Hindi ito kasama sa archive, feed, comments, at stars. Naka-store pa rin server-side ang payload maliban kung fragment sharing ang ginamit ng author.",
    visibilityPublic: "Kasama sa public feed.",
    visibilityUnlisted: "Makikita lang sa direktang link.",
    visibilityPrivate: "Makikita lang ng owner at moderators.",
    activityLabel: "Activity",
    activitySecret: (views) => `${views.toLocaleString()} view${views === 1 ? "" : "s"} ang na-track. Naka-disable ang comments at stars.`,
    activityPublic: (comments, stars) => `${comments} comments at ${stars} stars.`,
    moderationEyebrow: "Moderation",
    moderationBody: "I-flag ang content na dapat matingnan ng moderators.",
    reportSending: "Ipinapadala ang report...",
    reportGenericError: "Hindi maisumite ang report.",
    reportSubmitted: "Naipadala ang report. Salamat sa pagtulong na panatilihing malinis ang feed.",
    hideReportForm: "Itago ang form",
    report: "I-report",
    defaultReportReason: "Spam",
    reasonPlaceholder: "Dahilan",
    notesPlaceholder: "Opsyonal na notes para sa moderators",
    submitReport: "Isumite ang report"
  },
  ja: {
    publicEyebrow: "公開ペースト",
    secretEyebrow: "秘密リンク",
    anonymous: "匿名",
    untrustedHtmlRiskTitle: "信頼できない HTML の危険。",
    untrustedHtmlRiskBody:
      "このプレビューは scripts、forms、popups、same-origin access を許可します。悪意ある paste がセッションを利用したり誘導したりする可能性があります。信頼できる内容だけで使ってください。",
    untrustedHtmlRiskFooter:
      "最上位ナビゲーションはユーザー操作に制限されていますが、他の sandbox escape が起こる可能性は残ります。すべての paste を実行中のコードとして扱ってください。",
    updatedViews: (date, views) => `${date} に更新。${views.toLocaleString()} 回閲覧。`,
    secretLead: "このリンクは公開アーカイブに出ず、コメントとスターも無効です。",
    visibilityBadgePublic: "公開",
    visibilityBadgeUnlisted: "限定公開",
    visibilityBadgePrivate: "非公開",
    secretModeBadge: "秘密モード",
    passwordProtectedBadge: "パスワード保護",
    captchaRequiredBadge: "CAPTCHA 必須",
    burnAfterReadBadge: "閲覧後破棄",
    burnAfterViewsBadge: (views) => `${views} 回閲覧で破棄`,
    share: "共有",
    copyLink: "リンクをコピー",
    copyRawLink: "Raw リンクをコピー",
    fork: "Fork",
    forkTitle: "このペーストを fork した状態で workspace を開く",
    print: "印刷",
    codeImage: "コード画像",
    codeImageLockedTitle: "コード画像を出力するにはペーストを解除してください",
    codeImageReadyTitle: "コードを画像として出力",
    shareDialogText: (eyebrow) => `WOX-Bin の ${eyebrow}`,
    download: "ダウンロード",
    downloadRaw: "Raw を保存",
    raw: "Raw",
    star: "スター",
    starred: "スター済み",
    verificationRequired: "本人確認が必要です",
    passwordRequired: "パスワードが必要です",
    verificationDescription: "このペーストは、内容とコメントを表示する前に Turnstile challenge が必要です。",
    passwordDescription: "このペーストは保護されています。内容とコメントを見るにはパスワードを入力してください。",
    passwordPlaceholder: "ペーストのパスワード",
    verifyAndContinue: "確認して続行",
    unlockPaste: "ペーストを開く",
    verifying: "確認中...",
    unlocking: "解除中...",
    unlockCaptchaStepUp: "CAPTCHA が完了しました。続行するにはペーストのパスワードを入力してください。",
    unlockGenericError: "ペーストを解除できませんでした。",
    codeView: "コード表示",
    source: "ソース",
    preview: "プレビュー",
    lineNumbers: "行番号",
    lineGuides: "ガイド線",
    wordWrap: "折り返し",
    renderingPreview: "プレビューを生成しています...",
    nothingToPreview: "プレビューできる内容がありません。",
    attachedFiles: "添付ファイル",
    attachedFilesDescription: "複数ファイルのペーストはひとまとまりのまま表示され、共有された断片の文脈を保ちます。",
    attachmentDisplayError: "この添付ファイルは表示できませんでした。",
    discussionEyebrow: "ディスカッション",
    commentsTitle: "コメント",
    messages: (count) => `${count} 件`,
    secretNoComments: "秘密リンクでは公開コメントやスターは使えません。",
    unlockToComments: "コメントを読む・投稿するにはペーストを解除してください。",
    noComments: "まだコメントはありません。最初の返信が流れを決めることが多いです。",
    replyingTo: (author) => `${author} への返信`,
    cancelReply: "返信をやめる",
    reply: "返信",
    replyPlaceholder: "{author} に返信",
    commentPlaceholder: "ていねいなコメントを追加",
    postingComment: "投稿中...",
    commentGenericError: "コメントを投稿できませんでした。",
    postReply: "返信を投稿",
    postComment: "コメントを投稿",
    signInToJoin: "このペーストに参加したりスターするにはサインインしてください。",
    imageKind: "画像",
    videoKind: "動画",
    metadataEyebrow: "メタデータ",
    shareDetailsTitle: "共有情報",
    slugLabel: "Slug",
    visibilityLabel: "公開範囲",
    visibilitySecret:
      "秘密リンクモードです。アーカイブ、フィード、コメント、スターから除外されます。fragment sharing を使っていない限り、内容自体はサーバー側にも保存されます。",
    visibilityPublic: "公開フィードに掲載されます。",
    visibilityUnlisted: "直接リンクを知っている人だけが見られます。",
    visibilityPrivate: "所有者とモデレーターだけが見られます。",
    activityLabel: "アクティビティ",
    activitySecret: (views) => `${views.toLocaleString()} 回の閲覧を記録。コメントとスターは無効です。`,
    activityPublic: (comments, stars) => `${comments} 件のコメントと ${stars} 件のスター。`,
    moderationEyebrow: "モデレーション",
    moderationBody: "モデレーターに確認してほしい内容を報告できます。",
    reportSending: "報告を送信中...",
    reportGenericError: "報告を送信できませんでした。",
    reportSubmitted: "報告を送信しました。フィードを安全に保つための協力ありがとうございます。",
    hideReportForm: "フォームを閉じる",
    report: "報告",
    defaultReportReason: "スパム",
    reasonPlaceholder: "理由",
    notesPlaceholder: "モデレーター向けメモ（任意）",
    submitReport: "報告を送信"
  },
  es: {
    publicEyebrow: "Paste público",
    secretEyebrow: "Enlace secreto",
    anonymous: "Anónimo",
    untrustedHtmlRiskTitle: "Riesgo de HTML no confiable.",
    untrustedHtmlRiskBody:
      "Esta vista previa permite scripts, formularios, popups y acceso same-origin; un paste malicioso podría usar tu sesión o engañarte. Úsala solo con contenido en el que confíes.",
    untrustedHtmlRiskFooter:
      "La navegación de nivel superior está limitada a gestos del usuario, pero aún pueden existir otras fugas del sandbox; trata cada paste como código que estás ejecutando.",
    updatedViews: (date, views) => `Actualizado ${date}. ${views.toLocaleString()} vista${views === 1 ? "" : "s"}.`,
    secretLead: "Este enlace queda fuera del archivo público y desactiva comentarios y estrellas.",
    visibilityBadgePublic: "público",
    visibilityBadgeUnlisted: "oculto",
    visibilityBadgePrivate: "privado",
    secretModeBadge: "Modo secreto",
    passwordProtectedBadge: "Protegido con contraseña",
    captchaRequiredBadge: "CAPTCHA obligatorio",
    burnAfterReadBadge: "Destruir tras leer",
    burnAfterViewsBadge: (views) => `Destruir tras ${views} vista${views === 1 ? "" : "s"}`,
    share: "Compartir",
    copyLink: "Copiar enlace",
    copyRawLink: "Copiar enlace raw",
    fork: "Fork",
    forkTitle: "Abrir workspace con un fork de este paste",
    print: "Imprimir",
    codeImage: "Imagen del código",
    codeImageLockedTitle: "Desbloquea el paste para exportarlo como imagen",
    codeImageReadyTitle: "Exportar el código como imagen",
    shareDialogText: (eyebrow) => `${eyebrow} en WOX-Bin`,
    download: "Descargar",
    downloadRaw: "Descargar raw",
    raw: "Raw",
    star: "Estrella",
    starred: "Con estrella",
    verificationRequired: "Se requiere verificación humana",
    passwordRequired: "Se requiere contraseña",
    verificationDescription: "Este paste requiere un reto de Turnstile antes de mostrar el contenido y los comentarios.",
    passwordDescription: "Este paste está protegido. Introduce la contraseña para ver el contenido y los comentarios.",
    passwordPlaceholder: "Contraseña del paste",
    verifyAndContinue: "Verificar y continuar",
    unlockPaste: "Desbloquear paste",
    verifying: "Verificando...",
    unlocking: "Desbloqueando...",
    unlockCaptchaStepUp: "CAPTCHA completado. Introduce la contraseña del paste para continuar.",
    unlockGenericError: "No se pudo desbloquear el paste.",
    codeView: "Vista de código",
    source: "Fuente",
    preview: "Vista previa",
    lineNumbers: "Números de línea",
    lineGuides: "Guías de línea",
    wordWrap: "Ajuste de línea",
    renderingPreview: "Generando vista previa...",
    nothingToPreview: "No hay nada que previsualizar.",
    attachedFiles: "Archivos adjuntos",
    attachedFilesDescription: "Los pastes con varios archivos siguen agrupados para que los snippets compartidos mantengan su contexto.",
    attachmentDisplayError: "No se pudo mostrar este adjunto.",
    discussionEyebrow: "Discusión",
    commentsTitle: "Comentarios",
    messages: (count) => `${count} mensaje${count === 1 ? "" : "s"}`,
    secretNoComments: "Los enlaces secretos no admiten comentarios públicos ni estrellas.",
    unlockToComments: "Desbloquea el paste para leer o publicar comentarios.",
    noComments: "Todavía no hay comentarios. La primera respuesta suele marcar el tono.",
    replyingTo: (author) => `Respondiendo a ${author}`,
    cancelReply: "Cancelar respuesta",
    reply: "Responder",
    replyPlaceholder: "Responder a {author}",
    commentPlaceholder: "Añade un comentario útil",
    postingComment: "Publicando...",
    commentGenericError: "No se pudo publicar el comentario.",
    postReply: "Publicar respuesta",
    postComment: "Publicar comentario",
    signInToJoin: "Inicia sesión para unirte a la discusión o dar estrella a este paste.",
    imageKind: "imagen",
    videoKind: "video",
    metadataEyebrow: "Metadatos",
    shareDetailsTitle: "Detalles del share",
    slugLabel: "Slug",
    visibilityLabel: "Visibilidad",
    visibilitySecret:
      "Modo secret link. Queda oculto del archivo, el feed, los comentarios y las estrellas. El payload sigue almacenado del lado del servidor salvo que el autor haya usado fragment sharing.",
    visibilityPublic: "Listado en el feed público.",
    visibilityUnlisted: "Disponible solo mediante enlace directo.",
    visibilityPrivate: "Visible solo para el propietario y los moderadores.",
    activityLabel: "Actividad",
    activitySecret: (views) => `${views.toLocaleString()} vista${views === 1 ? "" : "s"} registradas. Los comentarios y las estrellas están desactivados.`,
    activityPublic: (comments, stars) => `${comments} comentarios y ${stars} estrellas.`,
    moderationEyebrow: "Moderación",
    moderationBody: "Marca contenido que deba ser revisado por moderadores.",
    reportSending: "Enviando reporte...",
    reportGenericError: "No se pudo enviar el reporte.",
    reportSubmitted: "Reporte enviado. Gracias por ayudar a mantener limpio el feed.",
    hideReportForm: "Ocultar formulario",
    report: "Reportar",
    defaultReportReason: "Spam",
    reasonPlaceholder: "Motivo",
    notesPlaceholder: "Notas opcionales para moderadores",
    submitReport: "Enviar reporte"
  }
};
