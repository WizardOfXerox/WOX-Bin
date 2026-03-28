import type { UiLanguage } from "@/lib/i18n";

type ToolCardCopy = {
  title: string;
  description: string;
};

type ToolsPageCopy = {
  overview: string;
  archive: string;
  eyebrow: string;
  title: string;
  description: string;
  liveLabel: string;
  featured: Record<string, ToolCardCopy>;
};

export const TOOLS_PAGE_COPY: Record<UiLanguage, ToolsPageCopy> = {
  en: {
    overview: "Overview",
    archive: "Archive",
    eyebrow: "Separate surface",
    title: "Tools",
    description:
      "WOX Tools is intentionally separate from the paste workspace at /app. Most tools are browser-only and do not touch your paste library unless you explicitly import or export data. Heavy image pairs (TIFF/RAW→WebP, etc.) use a server sharp endpoint (POST /api/convert/image) and are processed in memory for that request only. {liveCount} conversion-related tool{suffix} are currently marked live in the registry.",
    liveLabel: "live",
    featured: {
      "/tools/pdf-extract": {
        title: "PDF page extractor",
        description: "Rasterize pages, export PNG/JPEG/TXT/DOCX, previews, and drag-and-drop, all client-side."
      },
      "/tools/convert": {
        title: "Converter hub",
        description: "Live browser tools plus the Convertio index, with per-pair routes under /tools/c/{from}-{to}."
      },
      "/tools/image-convert": {
        title: "Image converter",
        description: "PNG, JPEG, WebP, and more in the browser with no upload."
      },
      "/tools/data-lab": {
        title: "Data lab",
        description: "CSV, TSV, JSON formatting, Base64, SHA-256, and more processed locally."
      },
      "/tools/privacy": {
        title: "Privacy suite",
        description: "Encrypted snapshots, chat, polls, proofs, and privacy redirect tools."
      },
      "/tools/scrub": {
        title: "Metadata scrubber",
        description: "Strip image metadata in the browser and download a cleaner copy."
      },
      "/tools/noref": {
        title: "NoRef generator",
        description: "Generate share links that hide the referring page."
      },
      "/tools/poll": {
        title: "Poll creator",
        description: "Create anonymous public polls with shareable result pages."
      },
      "/tools/zip-lab": {
        title: "ZIP lab",
        description: "Pack files into .zip or extract entries with fflate."
      },
      "/tools/markdown-html": {
        title: "Markdown to HTML",
        description: "Convert Markdown to a small HTML page in the browser."
      },
      "/tools/pdf-merge": {
        title: "PDF merge",
        description: "Concatenate PDFs with pdf-lib, fully client-side."
      },
      "/tools/pdf-split": {
        title: "PDF split",
        description: "Split a PDF into one file per page and package the result in a ZIP."
      },
      "/tools/text-convert": {
        title: "Text to HTML",
        description: "Escape text to HTML or strip tags back to plain text."
      }
    }
  },
  fil: {
    overview: "Overview",
    archive: "Archive",
    eyebrow: "Hiwalay na surface",
    title: "Tools",
    description:
      "Sadyang hiwalay ang WOX Tools sa paste workspace na nasa /app. Karamihan sa tools ay browser-only at hindi gagalaw sa paste library mo maliban kung kusa kang mag-import o mag-export ng data. Ang mabibigat na image pairs (TIFF/RAW→WebP atbp.) ay gumagamit ng server sharp endpoint (POST /api/convert/image) at pinoproseso lang sa memory para sa request na iyon. Sa ngayon, may {liveCount} conversion-related tool{suffix} na may markang live sa registry.",
    liveLabel: "live",
    featured: {
      "/tools/pdf-extract": {
        title: "PDF page extractor",
        description: "I-rasterize ang pages, mag-export ng PNG/JPEG/TXT/DOCX, previews, at drag-and-drop, lahat client-side."
      },
      "/tools/convert": {
        title: "Converter hub",
        description: "Live browser tools kasama ang Convertio index, na may per-pair routes sa /tools/c/{from}-{to}."
      },
      "/tools/image-convert": {
        title: "Image converter",
        description: "PNG, JPEG, WebP, at iba pa sa browser nang walang upload."
      },
      "/tools/data-lab": {
        title: "Data lab",
        description: "CSV, TSV, JSON formatting, Base64, SHA-256, at iba pa na lokal na pinoproseso."
      },
      "/tools/privacy": {
        title: "Privacy suite",
        description: "Encrypted snapshots, chat, polls, proofs, at privacy redirect tools."
      },
      "/tools/scrub": {
        title: "Metadata scrubber",
        description: "Tanggalin ang image metadata sa browser at mag-download ng mas malinis na kopya."
      },
      "/tools/noref": {
        title: "NoRef generator",
        description: "Gumawa ng share links na hindi nagpapadala ng referring page."
      },
      "/tools/poll": {
        title: "Poll creator",
        description: "Gumawa ng anonymous public polls na may shareable result pages."
      },
      "/tools/zip-lab": {
        title: "ZIP lab",
        description: "Mag-pack ng files sa .zip o mag-extract ng entries gamit ang fflate."
      },
      "/tools/markdown-html": {
        title: "Markdown to HTML",
        description: "I-convert ang Markdown sa maliit na HTML page sa browser."
      },
      "/tools/pdf-merge": {
        title: "PDF merge",
        description: "Pagsamahin ang PDFs gamit ang pdf-lib, lahat client-side."
      },
      "/tools/pdf-split": {
        title: "PDF split",
        description: "Hatiin ang PDF sa tig-isang file bawat page at ilagay sa ZIP."
      },
      "/tools/text-convert": {
        title: "Text to HTML",
        description: "I-escape ang text papuntang HTML o alisin ang tags pabalik sa plain text."
      }
    }
  },
  ja: {
    overview: "概要",
    archive: "アーカイブ",
    eyebrow: "分離されたサーフェス",
    title: "ツール",
    description:
      "WOX Tools は /app のペーストワークスペースとは意図的に分けられています。ほとんどのツールはブラウザ内だけで動作し、明示的に入出力しない限りペーストライブラリには触れません。重い画像変換ペア (TIFF/RAW→WebP など) は server sharp endpoint (POST /api/convert/image) を使い、そのリクエストのメモリ内だけで処理されます。現在レジストリで live とされている conversion-related tool は {liveCount} 件です。",
    liveLabel: "live",
    featured: {
      "/tools/pdf-extract": {
        title: "PDF ページ抽出",
        description: "ページをラスタライズし、PNG/JPEG/TXT/DOCX、プレビュー、ドラッグ＆ドロップまで全てクライアント側で行います。"
      },
      "/tools/convert": {
        title: "変換ハブ",
        description: "ライブのブラウザツールと Convertio index をまとめ、/tools/c/{from}-{to} にペア別ルートを持ちます。"
      },
      "/tools/image-convert": {
        title: "画像変換",
        description: "PNG、JPEG、WebP などをアップロードなしでブラウザ内変換します。"
      },
      "/tools/data-lab": {
        title: "データラボ",
        description: "CSV、TSV、JSON 整形、Base64、SHA-256 などをローカル処理します。"
      },
      "/tools/privacy": {
        title: "プライバシースイート",
        description: "暗号化スナップショット、チャット、投票、証明、プライバシーリダイレクトをまとめています。"
      },
      "/tools/scrub": {
        title: "メタデータ除去",
        description: "画像メタデータをブラウザ内で除去し、よりクリーンなコピーをダウンロードできます。"
      },
      "/tools/noref": {
        title: "NoRef 生成",
        description: "参照元ページを隠す共有リンクを生成します。"
      },
      "/tools/poll": {
        title: "投票作成",
        description: "共有可能な結果ページ付きの匿名公開投票を作成します。"
      },
      "/tools/zip-lab": {
        title: "ZIP ラボ",
        description: "fflate を使って zip の作成や展開を行います。"
      },
      "/tools/markdown-html": {
        title: "Markdown から HTML",
        description: "Markdown をブラウザ内で小さな HTML ページへ変換します。"
      },
      "/tools/pdf-merge": {
        title: "PDF 結合",
        description: "pdf-lib で PDF を結合します。完全にクライアント側で動きます。"
      },
      "/tools/pdf-split": {
        title: "PDF 分割",
        description: "PDF をページごとのファイルに分割し、ZIP にまとめます。"
      },
      "/tools/text-convert": {
        title: "テキストから HTML",
        description: "テキストを HTML 用にエスケープするか、タグを取り除いてプレーンテキストへ戻します。"
      }
    }
  },
  es: {
    overview: "Resumen",
    archive: "Archivo",
    eyebrow: "Superficie separada",
    title: "Tools",
    description:
      "WOX Tools está separado intencionalmente del paste workspace en /app. La mayoría de los tools viven solo en el navegador y no tocan tu biblioteca de pastes salvo que importes o exportes datos de forma explícita. Los pares de imagen pesados (TIFF/RAW→WebP, etc.) usan un server sharp endpoint (POST /api/convert/image) y se procesan solo en memoria para esa solicitud. Ahora mismo hay {liveCount} conversion-related tool{suffix} marcados como live en el registro.",
    liveLabel: "live",
    featured: {
      "/tools/pdf-extract": {
        title: "Extractor de páginas PDF",
        description: "Rasteriza páginas, exporta PNG/JPEG/TXT/DOCX, vistas previas y drag-and-drop, todo del lado del cliente."
      },
      "/tools/convert": {
        title: "Hub de conversión",
        description: "Tools de navegador en vivo más el índice de Convertio, con rutas por par en /tools/c/{from}-{to}."
      },
      "/tools/image-convert": {
        title: "Conversor de imágenes",
        description: "PNG, JPEG, WebP y más en el navegador, sin subir archivos."
      },
      "/tools/data-lab": {
        title: "Data lab",
        description: "CSV, TSV, formateo JSON, Base64, SHA-256 y más, procesado localmente."
      },
      "/tools/privacy": {
        title: "Privacy suite",
        description: "Snapshots cifrados, chat, encuestas, proofs y herramientas de redirección privada."
      },
      "/tools/scrub": {
        title: "Limpiador de metadatos",
        description: "Elimina metadatos de imágenes en el navegador y descarga una copia más limpia."
      },
      "/tools/noref": {
        title: "Generador NoRef",
        description: "Genera enlaces compartidos que ocultan la página de referencia."
      },
      "/tools/poll": {
        title: "Creador de encuestas",
        description: "Crea encuestas públicas anónimas con páginas de resultados compartibles."
      },
      "/tools/zip-lab": {
        title: "ZIP lab",
        description: "Empaqueta archivos en .zip o extrae entradas con fflate."
      },
      "/tools/markdown-html": {
        title: "Markdown a HTML",
        description: "Convierte Markdown en una pequeña página HTML en el navegador."
      },
      "/tools/pdf-merge": {
        title: "Unir PDF",
        description: "Concatena PDFs con pdf-lib, todo del lado del cliente."
      },
      "/tools/pdf-split": {
        title: "Dividir PDF",
        description: "Divide un PDF en un archivo por página y lo empaqueta en ZIP."
      },
      "/tools/text-convert": {
        title: "Texto a HTML",
        description: "Escapa texto a HTML o elimina etiquetas para volver a texto plano."
      }
    }
  }
};
