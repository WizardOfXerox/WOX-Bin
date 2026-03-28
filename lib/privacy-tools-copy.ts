import type { UiLanguage } from "@/lib/i18n";

type PrivacyToolCardCopy = {
  title: string;
  description: string;
};

type PrivacyToolsCopy = {
  eyebrow: string;
  title: string;
  description: string;
  tools: Record<string, PrivacyToolCardCopy>;
};

export const PRIVACY_TOOLS_COPY: Record<UiLanguage, PrivacyToolsCopy> = {
  en: {
    eyebrow: "Privacy tools",
    title: "Encrypted shares, proofs, polls, and metadata cleanup.",
    description:
      "This suite brings together the privacy-first features that fit WOX-Bin cleanly on Vercel: encrypted snapshots and chat, browser-side metadata scrubbing, public proof receipts, anonymous polls, and a first-class NoRef link generator.",
    tools: {
      "/snapshot": {
        title: "Snapshot",
        description: "Freeze a client-side encrypted text snapshot and share it with a fragment key."
      },
      "/scrub": {
        title: "Scrub",
        description: "Strip image metadata in the browser and download a cleaner copy without uploading it."
      },
      "/poll": {
        title: "Poll",
        description: "Create quick anonymous polls with multiple-choice support and public result pages."
      },
      "/proof": {
        title: "Proof",
        description: "Hash text or files, timestamp the digest, and share a verification receipt."
      },
      "/chat": {
        title: "Chat",
        description: "Spin up an encrypted temporary room where the server only sees ciphertext."
      },
      "/shorten": {
        title: "Short link",
        description: "Store a compact redirect slug that opens the destination through a no-referrer handoff."
      },
      "/noref": {
        title: "NoRef",
        description: "Generate referrer-hiding outbound links using WOX-Bin's built-in privacy redirect."
      }
    }
  },
  fil: {
    eyebrow: "Privacy tools",
    title: "Encrypted shares, proofs, polls, at metadata cleanup.",
    description:
      "Pinagsasama ng suite na ito ang privacy-first features na bagay sa WOX-Bin sa Vercel: encrypted snapshots at chat, browser-side metadata scrubbing, public proof receipts, anonymous polls, at malinaw na NoRef link generator.",
    tools: {
      "/snapshot": {
        title: "Snapshot",
        description: "I-freeze ang client-side encrypted text snapshot at i-share ito gamit ang fragment key."
      },
      "/scrub": {
        title: "Scrub",
        description: "Tanggalin ang image metadata sa browser at mag-download ng mas malinis na kopya nang walang upload."
      },
      "/poll": {
        title: "Poll",
        description: "Gumawa ng mabilis na anonymous polls na may multiple-choice support at public result pages."
      },
      "/proof": {
        title: "Proof",
        description: "I-hash ang text o files, lagyan ng timestamp ang digest, at magbahagi ng verification receipt."
      },
      "/chat": {
        title: "Chat",
        description: "Magbukas ng encrypted temporary room kung saan ciphertext lang ang nakikita ng server."
      },
      "/shorten": {
        title: "Short link",
        description: "Mag-save ng compact redirect slug na nagbubukas sa destination sa pamamagitan ng no-referrer handoff."
      },
      "/noref": {
        title: "NoRef",
        description: "Gumawa ng outbound links na nagtatago ng referrer gamit ang built-in privacy redirect ng WOX-Bin."
      }
    }
  },
  ja: {
    eyebrow: "プライバシーツール",
    title: "暗号化共有、証明、投票、メタデータ整理。",
    description:
      "このスイートは、WOX-Bin を Vercel 上で自然に使える privacy-first 機能をまとめます。暗号化スナップショットとチャット、ブラウザ側メタデータ除去、公開 proof receipt、匿名投票、そして NoRef リンク生成です。",
    tools: {
      "/snapshot": {
        title: "Snapshot",
        description: "クライアント側で暗号化したテキストスナップショットを固定し、fragment key と一緒に共有します。"
      },
      "/scrub": {
        title: "Scrub",
        description: "画像メタデータをブラウザ内で除去し、アップロードせずにきれいなコピーを取得します。"
      },
      "/poll": {
        title: "Poll",
        description: "複数選択対応と公開結果ページを備えた匿名投票をすばやく作成します。"
      },
      "/proof": {
        title: "Proof",
        description: "テキストやファイルをハッシュ化し、ダイジェストに時刻を付けて検証用レシートを共有します。"
      },
      "/chat": {
        title: "Chat",
        description: "サーバーには ciphertext しか見えない暗号化の一時ルームを作成します。"
      },
      "/shorten": {
        title: "Short link",
        description: "no-referrer handoff を通して宛先を開く短いリダイレクト slug を保存します。"
      },
      "/noref": {
        title: "NoRef",
        description: "WOX-Bin 内蔵の privacy redirect を使って参照元を隠す外部リンクを生成します。"
      }
    }
  },
  es: {
    eyebrow: "Tools de privacidad",
    title: "Compartición cifrada, proofs, polls y limpieza de metadatos.",
    description:
      "Esta suite reúne las funciones privacy-first que encajan bien en WOX-Bin sobre Vercel: snapshots y chat cifrados, limpieza de metadatos en el navegador, receipts públicos de proof, encuestas anónimas y un generador NoRef de primera clase.",
    tools: {
      "/snapshot": {
        title: "Snapshot",
        description: "Congela un snapshot de texto cifrado del lado del cliente y compártelo con una fragment key."
      },
      "/scrub": {
        title: "Scrub",
        description: "Elimina metadatos de imágenes en el navegador y descarga una copia más limpia sin subirla."
      },
      "/poll": {
        title: "Poll",
        description: "Crea encuestas anónimas rápidas con soporte multiple-choice y páginas públicas de resultados."
      },
      "/proof": {
        title: "Proof",
        description: "Haz hash de texto o archivos, pon marca de tiempo al digest y comparte un verification receipt."
      },
      "/chat": {
        title: "Chat",
        description: "Levanta una sala temporal cifrada donde el servidor solo ve ciphertext."
      },
      "/shorten": {
        title: "Short link",
        description: "Guarda un slug compacto de redirección que abre el destino mediante un handoff sin referrer."
      },
      "/noref": {
        title: "NoRef",
        description: "Genera enlaces salientes que ocultan el referrer usando el privacy redirect integrado de WOX-Bin."
      }
    }
  }
};
