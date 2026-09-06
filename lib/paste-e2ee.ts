import { createShareKey, decryptJsonWithKey, encryptJsonWithKey } from "@/lib/privacy-crypto";
import type { PasteFileDraft } from "@/lib/types";

export const E2EE_PREFIX = "wox-e2ee:v1:";

export type E2EEPayloadData = {
  title: string;
  content: string;
  files?: PasteFileDraft[];
};

export function isE2EEPayload(content: string | null | undefined): boolean {
  if (!content) return false;
  return content.startsWith(E2EE_PREFIX);
}

export function generateE2EEKey(): string {
  return createShareKey();
}

export async function encryptPasteClient(
  key: string,
  data: E2EEPayloadData
): Promise<string> {
  const encrypted = await encryptJsonWithKey(key, data);
  return `${E2EE_PREFIX}${encrypted.iv}:${encrypted.ciphertext}`;
}

export async function decryptPasteClient(
  key: string,
  rawPayload: string
): Promise<E2EEPayloadData> {
  if (!rawPayload.startsWith(E2EE_PREFIX)) {
    throw new Error("Invalid E2EE payload marker.");
  }

  const payloadPart = rawPayload.slice(E2EE_PREFIX.length);
  const colonIndex = payloadPart.indexOf(":");
  if (colonIndex === -1) {
    throw new Error("Malformed E2EE payload format.");
  }

  const iv = payloadPart.slice(0, colonIndex);
  const ciphertext = payloadPart.slice(colonIndex + 1);

  if (!iv || !ciphertext) {
    throw new Error("Missing IV or ciphertext in E2EE payload.");
  }

  return decryptJsonWithKey<E2EEPayloadData>(key, { iv, ciphertext });
}
