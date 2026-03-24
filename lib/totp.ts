import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_STEP_SECONDS = 30;
const TOTP_WINDOW = 1;
const TOTP_DIGITS = 6;

function normalizeBase32(input: string) {
  return input.toUpperCase().replace(/=+$/g, "").replace(/[^A-Z2-7]/g, "");
}

export function encodeBase32(input: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function decodeBase32(input: string) {
  const normalized = normalizeBase32(input);
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) {
      continue;
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function createTotpSecret() {
  return encodeBase32(randomBytes(20));
}

function hotp(secretBase32: string, counter: number, digits = TOTP_DIGITS) {
  const key = decodeBase32(secretBase32);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(buffer).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const code =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return String(code % 10 ** digits).padStart(digits, "0");
}

export function createTotpCode(secretBase32: string, now = Date.now(), digits = TOTP_DIGITS) {
  const counter = Math.floor(now / 1000 / TOTP_STEP_SECONDS);
  return hotp(secretBase32, counter, digits);
}

export function sanitizeTotpCode(input: string | null | undefined) {
  return String(input ?? "").replace(/\s+/g, "").replace(/-/g, "");
}

export function verifyTotpCode(secretBase32: string, input: string | null | undefined, now = Date.now()) {
  const normalized = sanitizeTotpCode(input);
  if (!/^\d{6}$/.test(normalized)) {
    return false;
  }

  const counter = Math.floor(now / 1000 / TOTP_STEP_SECONDS);
  const candidate = Buffer.from(normalized);
  for (let offset = -TOTP_WINDOW; offset <= TOTP_WINDOW; offset += 1) {
    const expected = Buffer.from(hotp(secretBase32, counter + offset));
    if (expected.length === candidate.length && timingSafeEqual(expected, candidate)) {
      return true;
    }
  }

  return false;
}

export function createOtpAuthUri({
  accountLabel,
  issuer,
  secret
}: {
  accountLabel: string;
  issuer: string;
  secret: string;
}) {
  const label = `${issuer}:${accountLabel}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS)
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

export function createRecoveryCodes(count = 8) {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString("hex").toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}
