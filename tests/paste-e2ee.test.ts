import { describe, expect, it } from "vitest";
import {
  decryptPasteClient,
  encryptPasteClient,
  generateE2EEKey,
  isE2EEPayload,
  E2EE_PREFIX
} from "@/lib/paste-e2ee";

describe("paste-e2ee Zero-Knowledge encryption", () => {
  it("identifies E2EE payloads by marker prefix", () => {
    expect(isE2EEPayload(null)).toBe(false);
    expect(isE2EEPayload("")).toBe(false);
    expect(isE2EEPayload("console.log('hello');")).toBe(false);
    expect(isE2EEPayload(`${E2EE_PREFIX}iv123:cipher456`)).toBe(true);
  });

  it("generates a random 256-bit encryption key", () => {
    const key1 = generateE2EEKey();
    const key2 = generateE2EEKey();
    expect(key1).toBeTruthy();
    expect(key2).toBeTruthy();
    expect(key1).not.toBe(key2);
    expect(key1.length).toBeGreaterThan(30);
  });

  it("encrypts and decrypts paste data cleanly in round-trip", async () => {
    const key = generateE2EEKey();
    const original = {
      title: "Secret Architecture Plan",
      content: "const topSecret = 'classified-information';",
      files: [
        {
          filename: "env.json",
          content: '{"API_KEY": "supersecret"}',
          language: "json"
        }
      ]
    };

    const encrypted = await encryptPasteClient(key, original);
    expect(encrypted.startsWith(E2EE_PREFIX)).toBe(true);
    expect(encrypted).not.toContain("classified-information");
    expect(encrypted).not.toContain("supersecret");

    const decrypted = await decryptPasteClient(key, encrypted);
    expect(decrypted.title).toBe(original.title);
    expect(decrypted.content).toBe(original.content);
    expect(decrypted.files).toHaveLength(1);
    expect(decrypted.files?.[0].content).toBe('{"API_KEY": "supersecret"}');
  });

  it("fails decryption when an incorrect key is provided", async () => {
    const key1 = generateE2EEKey();
    const key2 = generateE2EEKey();

    const encrypted = await encryptPasteClient(key1, {
      title: "Private Note",
      content: "Secret content"
    });

    await expect(decryptPasteClient(key2, encrypted)).rejects.toThrow();
  });

  it("fails decryption when payload is malformed", async () => {
    const key = generateE2EEKey();
    await expect(decryptPasteClient(key, "not-an-e2ee-payload")).rejects.toThrow(
      "Invalid E2EE payload marker."
    );
    await expect(decryptPasteClient(key, `${E2EE_PREFIX}invalidPayloadWithoutColon`)).rejects.toThrow(
      "Malformed E2EE payload format."
    );
  });
});
