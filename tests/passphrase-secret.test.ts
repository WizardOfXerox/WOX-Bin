import { describe, expect, it } from "vitest";
import {
  deriveKeyFromPassphrase,
  deriveKeyWithSalt,
  encryptJsonWithKey,
  decryptJsonWithKey
} from "@/lib/privacy-crypto";

describe("PBKDF2 Passphrase-Derived Secret Encryption", () => {
  it("derives a key and random salt from a passphrase", async () => {
    const passphrase = "correct-horse-battery-staple";
    const { key, salt } = await deriveKeyFromPassphrase(passphrase);

    expect(key).toBeTruthy();
    expect(salt).toBeTruthy();
    expect(key.length).toBeGreaterThan(20);
    expect(salt.length).toBeGreaterThan(10);
  });

  it("re-derives the identical key when provided the same salt", async () => {
    const passphrase = "correct-horse-battery-staple";
    const { key: initialKey, salt } = await deriveKeyFromPassphrase(passphrase);
    const reDerivedKey = await deriveKeyWithSalt(passphrase, salt);

    expect(reDerivedKey).toBe(initialKey);
  });

  it("derives different keys for different passphrases with the same salt", async () => {
    const { salt } = await deriveKeyFromPassphrase("passphrase-one");
    const key1 = await deriveKeyWithSalt("passphrase-one", salt);
    const key2 = await deriveKeyWithSalt("passphrase-two", salt);

    expect(key1).not.toBe(key2);
  });

  it("derives different keys for the same passphrase with different salts", async () => {
    const { key: key1 } = await deriveKeyFromPassphrase("same-passphrase");
    const { key: key2 } = await deriveKeyFromPassphrase("same-passphrase");

    expect(key1).not.toBe(key2);
  });

  it("encrypts and decrypts secret payload cleanly in round-trip using derived key", async () => {
    const passphrase = "super-secret-master-passphrase-2026!";
    const { key, salt } = await deriveKeyFromPassphrase(passphrase);

    const secretPayload = {
      title: "Production DB Credentials",
      content: "DATABASE_URL=postgres://admin:secret@db.internal:5432/main"
    };

    const encrypted = await encryptJsonWithKey(key, secretPayload);
    expect(encrypted.ciphertext).toBeTruthy();
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.ciphertext).not.toContain("DATABASE_URL");

    // Recipient derives key using the passphrase and shared salt
    const recipientKey = await deriveKeyWithSalt(passphrase, salt);
    const decrypted = await decryptJsonWithKey<typeof secretPayload>(recipientKey, encrypted);

    expect(decrypted.title).toBe(secretPayload.title);
    expect(decrypted.content).toBe(secretPayload.content);
  });

  it("fails decryption when recipient uses an incorrect passphrase", async () => {
    const passphrase = "correct-passphrase-123";
    const wrongPassphrase = "wrong-passphrase-456";

    const { key, salt } = await deriveKeyFromPassphrase(passphrase);
    const secretPayload = {
      title: "API Secret",
      content: "sk-live-0987654321"
    };

    const encrypted = await encryptJsonWithKey(key, secretPayload);

    // Recipient tries to decrypt with wrong passphrase
    const recipientWrongKey = await deriveKeyWithSalt(wrongPassphrase, salt);

    await expect(
      decryptJsonWithKey(recipientWrongKey, encrypted)
    ).rejects.toThrow();
  });
});
