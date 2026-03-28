import type { UiLanguage } from "@/lib/i18n";

type HelpFaqItem = {
  q: string;
  a: string;
};

type HelpFaqGroup = {
  title: string;
  description: string;
  items: readonly HelpFaqItem[];
};

type HelpPageCopy = {
  badge: string;
  eyebrow: string;
  title: string;
  description: string;
  supportCta: string;
  resetPasswordCta: string;
  docsCta: string;
  bestFirstActionsTitle: string;
  bestFirstActions: readonly string[];
  groups: readonly HelpFaqGroup[];
};

export const HELP_PAGE_COPY: Record<UiLanguage, HelpPageCopy> = {
  en: {
    badge: "Help",
    eyebrow: "WOX-Bin",
    title: "Fast answers for account, sharing, and workspace problems.",
    description:
      "This page is the first stop when something breaks. It answers the common issues directly so users do not need manual support when the fix is already known.",
    supportCta: "Go to support",
    resetPasswordCta: "Reset password",
    docsCta: "Open docs",
    bestFirstActionsTitle: "Best first actions",
    bestFirstActions: [
      "1. Read the error shown in the app first.",
      "2. Use account settings for sign-in methods, sessions, and password management.",
      "3. Use support only after the built-in answers here do not resolve the problem."
    ],
    groups: [
      {
        title: "Account access",
        description: "Answers written for users, not operators.",
        items: [
          {
            q: "I signed up but I cannot sign in.",
            a: "Password accounts must verify their email before sign-in is allowed. Check your inbox for the verification message, then retry. If the message expired, ask the operator to resend it."
          },
          {
            q: "I forgot my password.",
            a: "Use the forgot-password flow. If SMTP is configured on this deployment, WOX-Bin sends a reset link to your account email and revokes old browser sessions after the reset completes."
          },
          {
            q: "I used email/password first, then Google later. Is that a different account?",
            a: "Not if the Google account uses the same email address. WOX-Bin links Google to the existing account email instead of creating a second account for that same address."
          }
        ]
      },
      {
        title: "Security and sharing",
        description: "Answers written for users, not operators.",
        items: [
          {
            q: "Can I remove Google sign-in later?",
            a: "Yes, but only after you create a password on the account. The settings page blocks Google disconnect until password sign-in exists so the account is not left without a recovery path."
          },
          {
            q: "Why can’t I see a private or password-protected paste?",
            a: "Private pastes are owner-only unless you are staff. Password-protected pastes require the correct password or a valid access grant. Hidden or moderated pastes may also be unavailable."
          },
          {
            q: "What happens when I report abuse?",
            a: "Reports go to moderators. They can hide or delete pastes, suspend or ban accounts, and optionally notify the affected user by email with the moderation reason."
          }
        ]
      },
      {
        title: "Workspace and uploads",
        description: "Answers written for users, not operators.",
        items: [
          {
            q: "My local drafts are gone after switching devices.",
            a: "Local drafts live in the browser on that specific device. Sign in if you want hosted sync across devices, or export your data before moving machines."
          },
          {
            q: "Why was my upload rejected?",
            a: "Uploads can fail because of plan limits, file size, unsupported attachment MIME types, rate limits, or temporary provider issues. Check the exact message shown in the workspace first."
          },
          {
            q: "Where do I find API and product docs?",
            a: "Use the docs hub for operator and API details, and this Help page for user-level answers. They serve different audiences."
          }
        ]
      },
      {
        title: "Moderation and operator issues",
        description: "Answers written for users, not operators.",
        items: [
          {
            q: "My account says suspended or banned.",
            a: "That state is enforced server-side. You will see the restriction on sign-in and, when configured, by email. Use the support page to contact the operator if you need clarification."
          },
          {
            q: "Billing or plan access looks wrong.",
            a: "Check your current plan in Billing settings first. If checkout succeeded but the plan did not update, contact the operator with the email used for purchase and the payment timestamp."
          },
          {
            q: "I need manual help, not just FAQs.",
            a: "Use the support page. It points users to the operator contact path for issues that cannot be solved through settings, reset flows, or built-in Help answers."
          }
        ]
      }
    ]
  },
  fil: {
    badge: "Tulong",
    eyebrow: "WOX-Bin",
    title: "Mabilis na sagot para sa account, sharing, at workspace problems.",
    description:
      "Ito ang unang pupuntahan kapag may nasira. Sinasagot nito ang mga karaniwang issue nang diretso para hindi na kailangan ng manual support kapag kilala na ang ayos.",
    supportCta: "Pumunta sa support",
    resetPasswordCta: "I-reset ang password",
    docsCta: "Buksan ang docs",
    bestFirstActionsTitle: "Pinakamagandang unang gawin",
    bestFirstActions: [
      "1. Basahin muna ang error na ipinakita sa app.",
      "2. Gamitin ang account settings para sa sign-in methods, sessions, at password management.",
      "3. Gamitin lang ang support kapag hindi naresolba ng built-in answers dito ang problema."
    ],
    groups: [
      {
        title: "Access sa account",
        description: "Mga sagot para sa users, hindi para sa operators.",
        items: [
          {
            q: "Nakagawa ako ng account pero hindi ako makapag-sign in.",
            a: "Kailangang ma-verify muna ng password accounts ang email bago payagan ang sign-in. Tingnan ang inbox para sa verification message at subukan muli. Kapag expired na ito, magpahiling sa operator na magpadala ulit."
          },
          {
            q: "Nakalimutan ko ang password ko.",
            a: "Gamitin ang forgot-password flow. Kapag naka-configure ang SMTP sa deployment na ito, magpapadala ang WOX-Bin ng reset link sa email ng account at ire-revoke ang lumang browser sessions kapag natapos ang reset."
          },
          {
            q: "Email/password muna ang ginamit ko, tapos Google pagkatapos. Ibang account ba iyon?",
            a: "Hindi kung parehong email address ang gamit ng Google account. Ini-link ng WOX-Bin ang Google sa kasalukuyang email ng account imbes na gumawa ng pangalawang account para sa parehong address."
          }
        ]
      },
      {
        title: "Seguridad at sharing",
        description: "Mga sagot para sa users, hindi para sa operators.",
        items: [
          {
            q: "Pwede ko bang alisin ang Google sign-in sa susunod?",
            a: "Oo, pero kailangan munang gumawa ng password sa account. Hinaharang ng settings page ang Google disconnect hangga’t walang password sign-in para hindi maiwang walang recovery path ang account."
          },
          {
            q: "Bakit hindi ko makita ang private o password-protected na paste?",
            a: "Owner-only ang private pastes maliban kung staff ka. Kailangan ng tamang password o valid access grant para sa password-protected pastes. Posible ring hindi available ang hidden o moderated pastes."
          },
          {
            q: "Ano ang mangyayari kapag nag-report ako ng abuse?",
            a: "Mapupunta ang reports sa moderators. Maaari nilang i-hide o i-delete ang pastes, i-suspend o i-ban ang accounts, at kung gusto nila ay magpadala ng email sa apektadong user kasama ang moderation reason."
          }
        ]
      },
      {
        title: "Workspace at uploads",
        description: "Mga sagot para sa users, hindi para sa operators.",
        items: [
          {
            q: "Nawala ang local drafts ko matapos akong magpalit ng device.",
            a: "Nasa browser ng partikular na device ang local drafts. Mag-sign in kung gusto mo ng hosted sync across devices, o i-export ang data mo bago ka lumipat ng machine."
          },
          {
            q: "Bakit na-reject ang upload ko?",
            a: "Puwedeng mabigo ang uploads dahil sa plan limits, laki ng file, unsupported attachment MIME types, rate limits, o pansamantalang provider issues. Tingnan muna ang eksaktong mensaheng ipinakita sa workspace."
          },
          {
            q: "Saan ko makikita ang API at product docs?",
            a: "Gamitin ang docs hub para sa operator at API details, at itong Help page para sa user-level answers. Magkaiba ang audience ng dalawang iyon."
          }
        ]
      },
      {
        title: "Moderation at operator issues",
        description: "Mga sagot para sa users, hindi para sa operators.",
        items: [
          {
            q: "Naka-suspend o naka-ban daw ang account ko.",
            a: "Server-side ipinapatupad ang status na iyon. Makikita mo ang restriction sa sign-in at, kapag naka-configure, sa email. Gamitin ang support page kung kailangan mo ng paglilinaw mula sa operator."
          },
          {
            q: "Mukhang mali ang billing o access sa plan ko.",
            a: "Suriin muna ang current plan mo sa Billing settings. Kung matagumpay ang checkout pero hindi nag-update ang plan, kontakin ang operator gamit ang email na ginamit sa pagbili at ang payment timestamp."
          },
          {
            q: "Kailangan ko ng manual na tulong, hindi lang FAQs.",
            a: "Gamitin ang support page. Itinuturo nito ang operator contact path para sa mga issue na hindi maaayos ng settings, reset flows, o built-in Help answers."
          }
        ]
      }
    ]
  },
  ja: {
    badge: "ヘルプ",
    eyebrow: "WOX-Bin",
    title: "アカウント、共有、ワークスペースの問題にすばやく答えます。",
    description:
      "何かが壊れたときの最初の案内ページです。既知の対処がある問題はここで直接答えるので、毎回手動サポートに頼る必要はありません。",
    supportCta: "サポートへ",
    resetPasswordCta: "パスワードを再設定",
    docsCta: "ドキュメントを開く",
    bestFirstActionsTitle: "最初にやるべきこと",
    bestFirstActions: [
      "1. まずアプリに表示されたエラー文を確認してください。",
      "2. サインイン方法、セッション、パスワード管理はアカウント設定を使ってください。",
      "3. ここにある答えで解決しない場合だけサポートを使ってください。"
    ],
    groups: [
      {
        title: "アカウントアクセス",
        description: "運用者ではなく、利用者向けの回答です。",
        items: [
          {
            q: "登録したのにサインインできません。",
            a: "パスワードアカウントは、サインイン前にメール認証が必要です。受信箱の認証メールを確認してから再度お試しください。期限切れなら運用者に再送を依頼してください。"
          },
          {
            q: "パスワードを忘れました。",
            a: "forgot-password フローを使ってください。この環境で SMTP が設定されていれば、WOX-Bin はアカウントのメールへ再設定リンクを送り、完了後に古いブラウザセッションを無効化します。"
          },
          {
            q: "最初はメール/パスワード、その後 Google を使いました。別アカウントですか？",
            a: "Google アカウントが同じメールアドレスなら別アカウントにはなりません。WOX-Bin はそのメールに既存のアカウントを関連付け、同じアドレスのために二つ目のアカウントは作りません。"
          }
        ]
      },
      {
        title: "セキュリティと共有",
        description: "運用者ではなく、利用者向けの回答です。",
        items: [
          {
            q: "後で Google サインインを外せますか？",
            a: "はい。ただし先にアカウントへパスワードを設定する必要があります。復旧手段がなくならないよう、パスワードサインインが存在するまで設定画面は Google の切断を許可しません。"
          },
          {
            q: "なぜ private や password-protected のペーストが見えないのですか？",
            a: "private ペーストはスタッフ以外には所有者だけが見られます。password-protected ペーストは正しいパスワードまたは有効なアクセス許可が必要です。hidden や moderation 対象のペーストも利用できない場合があります。"
          },
          {
            q: "abuse を報告するとどうなりますか？",
            a: "報告はモデレーターに届きます。ペーストの非表示や削除、アカウント停止や BAN を行えます。設定によっては対象ユーザーへ理由付きメール通知も送られます。"
          }
        ]
      },
      {
        title: "ワークスペースとアップロード",
        description: "運用者ではなく、利用者向けの回答です。",
        items: [
          {
            q: "端末を変えたらローカル下書きが消えました。",
            a: "ローカル下書きはその端末のブラウザ内だけに保存されます。端末間で同期したい場合はサインインしてください。移行前にデータを書き出すこともできます。"
          },
          {
            q: "なぜアップロードが拒否されたのですか？",
            a: "プラン制限、ファイルサイズ、未対応 MIME タイプ、レート制限、一時的なプロバイダー障害などが原因になりえます。まずワークスペースに表示された正確なメッセージを確認してください。"
          },
          {
            q: "API や製品ドキュメントはどこですか？",
            a: "運用者向けや API 詳細は docs hub、この Help ページは利用者向けの回答です。対象が異なります。"
          }
        ]
      },
      {
        title: "モデレーションと運用者関連",
        description: "運用者ではなく、利用者向けの回答です。",
        items: [
          {
            q: "アカウントが suspended または banned と表示されます。",
            a: "その状態はサーバー側で適用されています。サインイン時に制限が表示され、設定があればメールでも通知されます。説明が必要なら support ページから運用者へ連絡してください。"
          },
          {
            q: "課金やプランの反映がおかしいです。",
            a: "まず Billing settings で現在のプランを確認してください。決済が成功したのに更新されない場合は、購入に使ったメールアドレスと決済時刻を添えて運用者へ連絡してください。"
          },
          {
            q: "FAQ ではなく手動サポートが必要です。",
            a: "support ページを使ってください。設定や再設定フロー、Help の既知回答で解決できない問題に対して、運用者への連絡手段を案内します。"
          }
        ]
      }
    ]
  },
  es: {
    badge: "Ayuda",
    eyebrow: "WOX-Bin",
    title: "Respuestas rápidas para problemas de cuenta, compartición y workspace.",
    description:
      "Esta página es la primera parada cuando algo falla. Responde los problemas comunes directamente para que no haga falta soporte manual cuando la solución ya es conocida.",
    supportCta: "Ir a soporte",
    resetPasswordCta: "Restablecer contraseña",
    docsCta: "Abrir docs",
    bestFirstActionsTitle: "Mejores primeros pasos",
    bestFirstActions: [
      "1. Lee primero el error que muestra la app.",
      "2. Usa la configuración de cuenta para métodos de inicio, sesiones y gestión de contraseña.",
      "3. Usa soporte solo cuando las respuestas integradas aquí no resuelvan el problema."
    ],
    groups: [
      {
        title: "Acceso a la cuenta",
        description: "Respuestas pensadas para usuarios, no para operadores.",
        items: [
          {
            q: "Me registré pero no puedo iniciar sesión.",
            a: "Las cuentas con contraseña deben verificar el correo antes de permitir el acceso. Revisa tu bandeja de entrada para el mensaje de verificación y vuelve a intentarlo. Si expiró, pide al operador que lo reenvíe."
          },
          {
            q: "Olvidé mi contraseña.",
            a: "Usa el flujo de forgot-password. Si SMTP está configurado en este despliegue, WOX-Bin enviará un enlace de restablecimiento al correo de tu cuenta y revocará las sesiones viejas del navegador cuando termine el cambio."
          },
          {
            q: "Primero usé email/contraseña y luego Google. ¿Es otra cuenta distinta?",
            a: "No si la cuenta de Google usa la misma dirección de correo. WOX-Bin vincula Google con el correo existente en lugar de crear una segunda cuenta para esa misma dirección."
          }
        ]
      },
      {
        title: "Seguridad y compartición",
        description: "Respuestas pensadas para usuarios, no para operadores.",
        items: [
          {
            q: "¿Puedo quitar Google sign-in después?",
            a: "Sí, pero solo después de crear una contraseña para la cuenta. La página de configuración bloquea la desconexión de Google hasta que exista el acceso por contraseña para no dejar la cuenta sin vía de recuperación."
          },
          {
            q: "¿Por qué no puedo ver un paste privado o protegido por contraseña?",
            a: "Los pastes privados son solo para el propietario salvo que seas staff. Los pastes protegidos requieren la contraseña correcta o un acceso válido. Los pastes ocultos o moderados también pueden no estar disponibles."
          },
          {
            q: "¿Qué pasa cuando reporto abuso?",
            a: "Los reportes van a moderación. Pueden ocultar o borrar pastes, suspender o bloquear cuentas y, si corresponde, avisar al usuario afectado por correo con la razón de moderación."
          }
        ]
      },
      {
        title: "Workspace y subidas",
        description: "Respuestas pensadas para usuarios, no para operadores.",
        items: [
          {
            q: "Mis borradores locales desaparecieron al cambiar de dispositivo.",
            a: "Los borradores locales viven en el navegador de ese dispositivo concreto. Inicia sesión si quieres sync alojado entre dispositivos, o exporta tus datos antes de cambiar de máquina."
          },
          {
            q: "¿Por qué se rechazó mi subida?",
            a: "Las subidas pueden fallar por límites del plan, tamaño de archivo, tipos MIME no soportados, rate limits o problemas temporales del proveedor. Revisa primero el mensaje exacto que muestra el workspace."
          },
          {
            q: "¿Dónde encuentro la API y la documentación del producto?",
            a: "Usa el docs hub para detalles de operador y API, y esta página de Ayuda para respuestas de nivel usuario. Están pensadas para públicos distintos."
          }
        ]
      },
      {
        title: "Moderación y problemas del operador",
        description: "Respuestas pensadas para usuarios, no para operadores.",
        items: [
          {
            q: "Mi cuenta dice suspendida o bloqueada.",
            a: "Ese estado se aplica del lado del servidor. Verás la restricción al iniciar sesión y, si está configurado, también por correo. Usa la página de soporte si necesitas una aclaración del operador."
          },
          {
            q: "La facturación o el acceso al plan parece incorrecto.",
            a: "Primero revisa tu plan actual en Billing settings. Si el checkout salió bien pero el plan no se actualizó, contacta al operador con el correo usado para la compra y la hora del pago."
          },
          {
            q: "Necesito ayuda manual, no solo FAQs.",
            a: "Usa la página de soporte. Te lleva al contacto con el operador para problemas que no pueden resolverse desde settings, reset flows o las respuestas integradas de Ayuda."
          }
        ]
      }
    ]
  }
};
