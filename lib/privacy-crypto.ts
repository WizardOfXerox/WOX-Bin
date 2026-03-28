export type EncryptedPayload = {
  ciphertext: string;
  iv: string;
};

export type EncryptedBinaryPayload = {
  ciphertext: Uint8Array;
  iv: string;
};

function encodeBytes(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function importKey(rawKey: string) {
  return crypto.subtle.importKey("raw", decodeBytes(rawKey), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export function createShareKey() {
  return encodeBytes(crypto.getRandomValues(new Uint8Array(32)));
}

export async function encryptJsonWithKey<T>(key: string, value: T): Promise<EncryptedPayload> {
  const imported = await importKey(key);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    imported,
    encoded
  );

  return {
    ciphertext: encodeBytes(new Uint8Array(ciphertext)),
    iv: encodeBytes(iv)
  };
}

export async function encryptBytesWithKey(
  key: string,
  value: ArrayBuffer | Uint8Array
): Promise<EncryptedBinaryPayload> {
  const imported = await importKey(key);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const source = value instanceof Uint8Array ? value : new Uint8Array(value);
  const plainBytes = new Uint8Array(source.byteLength);
  plainBytes.set(source);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    imported,
    plainBytes
  );

  return {
    ciphertext: new Uint8Array(ciphertext),
    iv: encodeBytes(iv)
  };
}

export async function decryptJsonWithKey<T>(key: string, payload: EncryptedPayload): Promise<T> {
  const imported = await importKey(key);
  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: decodeBytes(payload.iv)
    },
    imported,
    decodeBytes(payload.ciphertext)
  );

  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

export async function decryptBytesWithKey(
  key: string,
  payload: EncryptedBinaryPayload
): Promise<Uint8Array> {
  const imported = await importKey(key);
  const cipherBytes = new Uint8Array(payload.ciphertext.byteLength);
  cipherBytes.set(payload.ciphertext);
  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: decodeBytes(payload.iv)
    },
    imported,
    cipherBytes
  );

  return new Uint8Array(plain);
}

export async function sha256Hex(buffer: BufferSource) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Text(value: string) {
  return sha256Hex(new TextEncoder().encode(value));
}
