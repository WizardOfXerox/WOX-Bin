/**
 * Pastebin.com official API (server-side only).
 * @see https://pastebin.com/doc_api
 */

export type PastebinListItem = {
  key: string;
  title: string;
  /** 0 public, 1 unlisted, 2 private */
  private: 0 | 1 | 2;
  formatShort: string;
};

const API_BASE = "https://pastebin.com/api";

function formBody(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

async function postPastebin(path: string, params: Record<string, string>, timeoutMs: number): Promise<string> {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: formBody(params),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs)
  });
  return res.text();
}

/**
 * Returns `api_user_key` on success.
 */
export async function pastebinLogin(devKey: string, username: string, password: string): Promise<string> {
  const text = await postPastebin(
    "api_login.php",
    {
      api_dev_key: devKey,
      api_user_name: username,
      api_user_password: password
    },
    20_000
  );
  const t = text.trim();
  if (t.startsWith("Bad API request") || t.includes("Bad login")) {
    throw new Error(t.split("\n")[0] ?? "Pastebin login failed");
  }
  if (t.length < 8) {
    throw new Error("Unexpected Pastebin login response");
  }
  return t;
}

/**
 * Parse `<paste>` list from api_list.php (XML).
 */
export function parsePastebinListXml(xml: string): PastebinListItem[] {
  const trimmed = xml.trim();
  if (trimmed.startsWith("Bad API request")) {
    throw new Error(trimmed.split("\n")[0] ?? "Pastebin list failed");
  }
  const items: PastebinListItem[] = [];
  const re = /<paste>([\s\S]*?)<\/paste>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1]!;
    const key = extractTag(block, "paste_key");
    if (!key) {
      continue;
    }
    const title = extractCdataOrTag(block, "paste_title");
    const priv = Number(extractTag(block, "paste_private") ?? "0");
    const formatShort = extractTag(block, "paste_format_short") ?? "text";
    items.push({
      key,
      title: title || key,
      private: priv === 2 ? 2 : priv === 1 ? 1 : 0,
      formatShort
    });
  }
  return items;
}

function extractTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
  const m = re.exec(block);
  return m?.[1]?.trim() ?? null;
}

function extractCdataOrTag(block: string, tag: string): string {
  const cdata = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i").exec(block);
  if (cdata?.[1] != null) {
    return cdata[1].trim();
  }
  return extractTag(block, tag) ?? "";
}

export async function pastebinListPastes(devKey: string, userKey: string, limit: number): Promise<PastebinListItem[]> {
  const capped = Math.min(1000, Math.max(1, limit));
  const xml = await postPastebin(
    "api_list.php",
    {
      api_dev_key: devKey,
      api_user_key: userKey,
      api_option: "list",
      api_results_limit: String(capped)
    },
    45_000
  );
  return parsePastebinListXml(xml);
}

/**
 * Raw paste body (includes private pastes when user key is valid).
 * @see Pastebin doc §8 — api_raw.php + show_paste
 */
export async function pastebinFetchPasteRaw(devKey: string, userKey: string, pasteKey: string): Promise<string> {
  const text = await postPastebin(
    "api_raw.php",
    {
      api_dev_key: devKey,
      api_user_key: userKey,
      api_option: "show_paste",
      api_paste_key: pasteKey
    },
    45_000
  ).catch(() => "");
  const t = text.trim();
  if (t && !t.startsWith("Bad API request")) {
    return text;
  }
  /* Public / unlisted fallback */
  const res = await fetch(`https://pastebin.com/raw/${encodeURIComponent(pasteKey)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000)
  });
  if (!res.ok) {
    throw new Error(t.startsWith("Bad API request") ? t.split("\n")[0]! : `Could not fetch paste ${pasteKey}`);
  }
  return res.text();
}
