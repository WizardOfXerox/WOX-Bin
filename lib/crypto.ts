import bcrypt from "bcryptjs";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual
} from "crypto";

import { env, requireEnv } from "@/lib/env";

export async function hashPassword(value: string) {
  return bcrypt.hash(value, 12);
}

export async function verifyPassword(value: string, hash: string) {
  return bcrypt.compare(value, hash);
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function deriveSensitiveValueKey() {
  return createHash("sha256").update(requireEnv("AUTH_SECRET")).digest();
}

export function encryptSensitiveValue(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveSensitiveValueKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSensitiveValue(value: string) {
  const [ivRaw, tagRaw, payloadRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !payloadRaw) {
    throw new Error("Invalid encrypted value format.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveSensitiveValueKey(),
    Buffer.from(ivRaw, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadRaw, "base64url")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}

export function randomToken(prefix?: string) {
  const token = randomBytes(24).toString("hex");
  return prefix ? `${prefix}_${token}` : token;
}

export function hashIp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return createHash("sha256").update(value).digest("hex");
}

export function createPasteAccessGrant(slug: string, passwordHash: string) {
  const secret = requireEnv("AUTH_SECRET");
  const issuedAt = Date.now().toString();
  const digest = createHmac("sha256", secret)
    .update(`${slug}:${passwordHash}:${issuedAt}`)
    .digest("hex");

  return `${issuedAt}.${digest}`;
}

export function createPasteCaptchaGrant(slug: string) {
  const secret = requireEnv("AUTH_SECRET");
  const issuedAt = Date.now().toString();
  const digest = createHmac("sha256", secret)
    .update(`${slug}:captcha:${issuedAt}`)
    .digest("hex");

  return `${issuedAt}.${digest}`;
}

export function verifyPasteAccessGrant(slug: string, passwordHash: string, token: string | null | undefined) {
  if (!token) {
    return false;
  }

  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) {
    return false;
  }

  const maxAgeMs = 1000 * 60 * 60 * 12;
  if (Date.now() - Number(issuedAt) > maxAgeMs) {
    return false;
  }

  const secret = env.AUTH_SECRET;
  if (!secret) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${slug}:${passwordHash}:${issuedAt}`)
    .digest("hex");

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function verifyPasteCaptchaGrant(slug: string, token: string | null | undefined) {
  if (!token) {
    return false;
  }

  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) {
    return false;
  }

  const maxAgeMs = 1000 * 60 * 60 * 12;
  if (Date.now() - Number(issuedAt) > maxAgeMs) {
    return false;
  }

  const secret = env.AUTH_SECRET;
  if (!secret) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${slug}:captcha:${issuedAt}`)
    .digest("hex");

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
