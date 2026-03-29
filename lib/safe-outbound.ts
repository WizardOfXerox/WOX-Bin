import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export class SafeOutboundError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function isPrivateIpv4(address: string) {
  return (
    address.startsWith("10.") ||
    address.startsWith("127.") ||
    address.startsWith("192.168.") ||
    address.startsWith("169.254.") ||
    address === "0.0.0.0" ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd")
  );
}

function isPrivateAddress(address: string) {
  const version = isIP(address);
  if (version === 4) {
    return isPrivateIpv4(address);
  }
  if (version === 6) {
    return isPrivateIpv6(address);
  }
  return true;
}

function normalizeUrlInput(raw: string | URL) {
  try {
    return raw instanceof URL ? new URL(raw.toString()) : new URL(raw);
  } catch {
    throw new SafeOutboundError("Invalid URL.", 400);
  }
}

export async function assertSafePublicUrl(raw: string | URL, label = "URL") {
  const url = normalizeUrlInput(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SafeOutboundError(`${label} must use http or https.`, 400);
  }

  const hostname = url.hostname.trim().toLowerCase();
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new SafeOutboundError(`${label} must point to a public host.`, 400);
  }

  if (isIP(hostname) && isPrivateAddress(hostname)) {
    throw new SafeOutboundError(`${label} must point to a public host.`, 400);
  }

  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new SafeOutboundError(`${label} host could not be resolved.`, 400);
  }

  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new SafeOutboundError(`${label} must point to a public host.`, 400);
  }

  return url;
}

function headersWithSafeDefaults(input?: HeadersInit) {
  const headers = new Headers(input);
  if (!headers.has("accept-encoding")) {
    headers.set("accept-encoding", "identity");
  }
  return headers;
}

function isRedirectStatus(status: number) {
  return REDIRECT_STATUSES.has(status);
}

export async function safeFetchPublicUrl(
  raw: string | URL,
  options?: Omit<RequestInit, "redirect"> & {
    label?: string;
    maxRedirects?: number;
  }
) {
  const label = options?.label ?? "URL";
  const maxRedirects = options?.maxRedirects ?? 3;
  const headers = headersWithSafeDefaults(options?.headers);
  let target = await assertSafePublicUrl(raw, label);

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const response = await fetch(target.toString(), {
      ...options,
      headers,
      cache: "no-store",
      redirect: "manual"
    });

    if (!isRedirectStatus(response.status)) {
      return {
        response,
        finalUrl: target
      };
    }

    const location = response.headers.get("location");
    await response.body?.cancel().catch(() => undefined);

    if (!location) {
      throw new SafeOutboundError(`${label} redirected without a Location header.`, 502);
    }

    if (redirectCount >= maxRedirects) {
      throw new SafeOutboundError(`${label} redirected too many times.`, 502);
    }

    target = await assertSafePublicUrl(new URL(location, target), label);
  }

  throw new SafeOutboundError(`${label} redirected too many times.`, 502);
}

export async function readResponseBytesCapped(response: Response, maxBytes: number, label: string) {
  const lengthHeader = response.headers.get("content-length");
  const parsedLength = lengthHeader ? Number(lengthHeader) : NaN;
  if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
    throw new SafeOutboundError(`${label} is too large (max ${maxBytes} bytes).`, 413);
  }

  if (!response.body) {
    return Buffer.alloc(0);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const chunk = value ?? new Uint8Array();
      total += chunk.byteLength;
      if (total > maxBytes) {
        await reader.cancel("response-too-large").catch(() => undefined);
        throw new SafeOutboundError(`${label} is too large (max ${maxBytes} bytes).`, 413);
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

export async function readResponseTextCapped(response: Response, maxBytes: number, label: string) {
  const bytes = await readResponseBytesCapped(response, maxBytes, label);
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}
