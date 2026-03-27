import type { UiLanguage } from "@/lib/i18n";

type AuthPageCopy = {
  sessionErrors: Record<string, string>;
  sessionErrorFallback: string;
  emailVerify: Record<string, { tone: "ok" | "warn"; text: string }>;
  authErrors: Record<string, string>;
  authErrorFallback: string;
  magicLinkFailed: string;
  magicLinkSent: string;
  recoverFailed: string;
  recoverSentWithEmail: string;
  recoverSentGeneric: string;
  legalPrefix: string;
  legalConnector: string;
  registrationFailed: string;
};

export const AUTH_PAGE_COPY: Record<UiLanguage, AuthPageCopy> = {
  en: {
    sessionErrors: {
      SessionRevoked: "This session was signed out or revoked elsewhere. Sign in again.",
      SessionIdleTimeout: "You were signed out after a period of inactivity. Sign in again.",
      AccountSuspended: "Your account is currently suspended. If you believe this is incorrect, contact the site operator.",
      AccountBanned: "Your account has been banned. If you believe this is incorrect, contact the site operator."
    },
    sessionErrorFallback: "Your session is no longer valid. Sign in again.",
    emailVerify: {
      pending: { tone: "ok", text: "Account created. Check your email to verify your address before signing in." },
      ok: { tone: "ok", text: "Email verified. You can sign in below." },
      invalid: {
        tone: "warn",
        text: "That verification link is invalid or expired. Request a new one from account settings after signing in."
      },
      missing: { tone: "warn", text: "Verification link was missing a token." }
    },
    authErrors: {
      emailNotVerified:
        "Your email is not verified yet. Check your inbox for the verification link, or use verification help below.",
      accountSuspended:
        "Your account is currently suspended. Check your email for details or contact the site operator.",
      accountBanned: "Your account has been banned. Contact the site operator if you need clarification."
    },
    authErrorFallback: "Sign in failed.",
    magicLinkFailed: "Could not send sign-in email. Check the address and try again.",
    magicLinkSent: "Check your inbox for a sign-in link.",
    recoverFailed: "Could not recover verification email.",
    recoverSentWithEmail: "Verification email sent to {email}.",
    recoverSentGeneric: "Verification email sent. Check your inbox.",
    legalPrefix: "Use of WOX-Bin is subject to our",
    legalConnector: "and",
    registrationFailed: "Registration failed."
  },
  fil: {
    sessionErrors: {
      SessionRevoked: "Na-sign out o na-revoke ang session na ito sa ibang lugar. Mag-sign in ulit.",
      SessionIdleTimeout: "Na-sign out ka matapos ang mahabang inactivity. Mag-sign in ulit.",
      AccountSuspended:
        "Naka-suspend ang account mo sa ngayon. Kung tingin mong mali ito, kontakin ang site operator.",
      AccountBanned:
        "Na-ban ang account mo. Kung kailangan mo ng paglilinaw, kontakin ang site operator."
    },
    sessionErrorFallback: "Hindi na valid ang session mo. Mag-sign in ulit.",
    emailVerify: {
      pending: { tone: "ok", text: "Nagawa ang account. Tingnan ang email mo para ma-verify bago mag-sign in." },
      ok: { tone: "ok", text: "Na-verify na ang email. Maaari ka nang mag-sign in sa ibaba." },
      invalid: {
        tone: "warn",
        text: "Invalid o expired ang verification link na iyon. Humingi ng bago mula sa account settings pagkatapos mag-sign in."
      },
      missing: { tone: "warn", text: "Walang token ang verification link." }
    },
    authErrors: {
      emailNotVerified:
        "Hindi pa verified ang email mo. Tingnan ang inbox para sa verification link, o gamitin ang verification help sa ibaba.",
      accountSuspended:
        "Naka-suspend ang account mo sa ngayon. Tingnan ang email mo para sa detalye o kontakin ang site operator.",
      accountBanned: "Na-ban ang account mo. Kontakin ang site operator kung kailangan mo ng paglilinaw."
    },
    authErrorFallback: "Hindi nagtagumpay ang sign in.",
    magicLinkFailed: "Hindi maipadala ang sign-in email. Suriin ang address at subukan ulit.",
    magicLinkSent: "Tingnan ang inbox mo para sa sign-in link.",
    recoverFailed: "Hindi na-recover ang verification email.",
    recoverSentWithEmail: "Naipadala ang verification email sa {email}.",
    recoverSentGeneric: "Naipadala ang verification email. Tingnan ang inbox mo.",
    legalPrefix: "Ang paggamit ng WOX-Bin ay sumusunod sa aming",
    legalConnector: "at",
    registrationFailed: "Hindi nagtagumpay ang registration."
  },
  ja: {
    sessionErrors: {
      SessionRevoked: "このセッションは別の場所でサインアウトまたは取り消されました。もう一度サインインしてください。",
      SessionIdleTimeout: "一定時間操作がなかったためサインアウトされました。もう一度サインインしてください。",
      AccountSuspended: "このアカウントは現在停止中です。誤りだと思われる場合はサイト管理者に連絡してください。",
      AccountBanned: "このアカウントは停止されています。必要であればサイト管理者にお問い合わせください。"
    },
    sessionErrorFallback: "このセッションは無効です。もう一度サインインしてください。",
    emailVerify: {
      pending: { tone: "ok", text: "アカウントが作成されました。サインイン前にメール認証を完了してください。" },
      ok: { tone: "ok", text: "メール認証が完了しました。下からサインインできます。" },
      invalid: {
        tone: "warn",
        text: "認証リンクが無効または期限切れです。サインイン後にアカウント設定から再送してください。"
      },
      missing: { tone: "warn", text: "認証リンクにトークンがありませんでした。" }
    },
    authErrors: {
      emailNotVerified:
        "メールはまだ認証されていません。認証リンクを確認するか、下の認証ヘルプを使用してください。",
      accountSuspended:
        "アカウントは現在停止中です。詳細はメールを確認するか、サイト管理者に連絡してください。",
      accountBanned: "アカウントは停止されています。必要であればサイト管理者に連絡してください。"
    },
    authErrorFallback: "サインインに失敗しました。",
    magicLinkFailed: "サインインメールを送信できませんでした。アドレスを確認してもう一度お試しください。",
    magicLinkSent: "サインイン用リンクをメールで送信しました。受信箱をご確認ください。",
    recoverFailed: "認証メールを再送できませんでした。",
    recoverSentWithEmail: "{email} に認証メールを送信しました。",
    recoverSentGeneric: "認証メールを送信しました。受信箱をご確認ください。",
    legalPrefix: "WOX-Bin の利用には",
    legalConnector: "および",
    registrationFailed: "登録に失敗しました。"
  },
  es: {
    sessionErrors: {
      SessionRevoked: "Esta sesión se cerró o fue revocada en otro lugar. Inicia sesión otra vez.",
      SessionIdleTimeout: "Se cerró tu sesión tras un periodo de inactividad. Inicia sesión otra vez.",
      AccountSuspended: "Tu cuenta está suspendida actualmente. Si crees que es un error, contacta al operador del sitio.",
      AccountBanned: "Tu cuenta ha sido bloqueada. Si necesitas aclaración, contacta al operador del sitio."
    },
    sessionErrorFallback: "Tu sesión ya no es válida. Inicia sesión otra vez.",
    emailVerify: {
      pending: { tone: "ok", text: "Cuenta creada. Revisa tu correo para verificar la dirección antes de iniciar sesión." },
      ok: { tone: "ok", text: "Correo verificado. Ya puedes iniciar sesión abajo." },
      invalid: {
        tone: "warn",
        text: "Ese enlace de verificación no es válido o expiró. Pide uno nuevo desde la configuración de cuenta después de iniciar sesión."
      },
      missing: { tone: "warn", text: "Al enlace de verificación le faltaba un token." }
    },
    authErrors: {
      emailNotVerified:
        "Tu correo todavía no está verificado. Revisa tu bandeja de entrada para el enlace o usa la ayuda de verificación abajo.",
      accountSuspended:
        "Tu cuenta está suspendida actualmente. Revisa tu correo para los detalles o contacta al operador del sitio.",
      accountBanned: "Tu cuenta ha sido bloqueada. Contacta al operador del sitio si necesitas aclaración."
    },
    authErrorFallback: "No se pudo iniciar sesión.",
    magicLinkFailed: "No se pudo enviar el correo de inicio de sesión. Revisa la dirección e inténtalo de nuevo.",
    magicLinkSent: "Revisa tu bandeja de entrada para el enlace de inicio de sesión.",
    recoverFailed: "No se pudo recuperar el correo de verificación.",
    recoverSentWithEmail: "Correo de verificación enviado a {email}.",
    recoverSentGeneric: "Correo de verificación enviado. Revisa tu bandeja de entrada.",
    legalPrefix: "El uso de WOX-Bin está sujeto a nuestros",
    legalConnector: "y a la",
    registrationFailed: "No se pudo completar el registro."
  }
};
