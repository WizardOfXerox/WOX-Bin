import { storageLocalGet, storageLocalRemove, storageLocalSet } from "../storage/chrome-local.js";

export const WOXBIN_STORAGE = {
  baseUrl: "woxbin_base_url",
  apiKey: "woxbin_api_key",
  urlPresets: "woxbin_url_presets",
  draft: "woxbin_composer_draft",
  onboardingDismissed: "woxbin_onboarding_dismissed",
  recentSlugs: "woxbin_recent_slugs",
  profiles: "woxbin_profiles_v2",
  selectedProfileId: "woxbin_selected_profile_id",
  pendingCompose: "woxbin_pending_compose",
  offlineCache: "woxbin_offline_cache_v1"
};

const passphraseCache = new Map();

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `wbp_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function textEncoder() {
  return new TextEncoder();
}

function textDecoder() {
  return new TextDecoder();
}

function encodeBase64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) {
    s += String.fromCharCode(bytes[i]);
  }
  return btoa(s);
}

function decodeBase64(text) {
  const raw = atob(text);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(passphrase, salt) {
  const material = await crypto.subtle.importKey("raw", textEncoder().encode(passphrase), "PBKDF2", false, [
    "deriveKey"
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptSecret(secret, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, textEncoder().encode(secret));
  return {
    encrypted: true,
    cipherText: encodeBase64(new Uint8Array(encrypted)),
    salt: encodeBase64(salt),
    iv: encodeBase64(iv)
  };
}

async function decryptSecret(encryptedSecret, passphrase) {
  const key = await deriveAesKey(passphrase, decodeBase64(encryptedSecret.salt));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64(encryptedSecret.iv) },
    key,
    decodeBase64(encryptedSecret.cipherText)
  );
  return textDecoder().decode(new Uint8Array(decrypted));
}

export function normalizeBaseUrl(raw) {
  const s = String(raw || "").trim().replace(/\/+$/, "");
  if (!s) return "";
  try {
    const u = new URL(s);
    const localHttp = u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname);
    if (!(u.protocol === "https:" || localHttp)) {
      return "";
    }
    if (u.pathname !== "/" || u.search || u.hash) {
      return "";
    }
    return u.origin;
  } catch {
    return "";
  }
}

function sanitizeProfile(rawProfile) {
  if (!rawProfile || typeof rawProfile !== "object") {
    return null;
  }

  const baseUrl = normalizeBaseUrl(rawProfile.baseUrl);
  if (!baseUrl) {
    return null;
  }

  const label = String(rawProfile.label || "").trim() || new URL(baseUrl).hostname;
  const apiKey = typeof rawProfile.apiKey === "string" ? rawProfile.apiKey.trim() : "";
  const encryptedSecret =
    rawProfile.encryptedSecret &&
    typeof rawProfile.encryptedSecret === "object" &&
    typeof rawProfile.encryptedSecret.cipherText === "string" &&
    typeof rawProfile.encryptedSecret.salt === "string" &&
    typeof rawProfile.encryptedSecret.iv === "string"
      ? rawProfile.encryptedSecret
      : null;

  return {
    id: String(rawProfile.id || randomId()),
    label: label.slice(0, 64),
    baseUrl,
    apiKey,
    encryptedSecret,
    createdAt: rawProfile.createdAt || new Date().toISOString(),
    updatedAt: rawProfile.updatedAt || new Date().toISOString()
  };
}

export async function loadProfiles() {
  const data = await storageLocalGet([
    WOXBIN_STORAGE.profiles,
    WOXBIN_STORAGE.selectedProfileId,
    WOXBIN_STORAGE.baseUrl,
    WOXBIN_STORAGE.apiKey
  ]);

  let profiles = Array.isArray(data[WOXBIN_STORAGE.profiles])
    ? data[WOXBIN_STORAGE.profiles].map(sanitizeProfile).filter(Boolean)
    : [];

  if (!profiles.length) {
    const legacyBaseUrl = normalizeBaseUrl(data[WOXBIN_STORAGE.baseUrl]);
    const legacyApiKey = typeof data[WOXBIN_STORAGE.apiKey] === "string" ? data[WOXBIN_STORAGE.apiKey].trim() : "";
    if (legacyBaseUrl && legacyApiKey) {
      const migrated = sanitizeProfile({
        id: randomId(),
        label: new URL(legacyBaseUrl).hostname,
        baseUrl: legacyBaseUrl,
        apiKey: legacyApiKey
      });
      if (migrated) {
        profiles = [migrated];
        await storageLocalSet({
          [WOXBIN_STORAGE.profiles]: profiles,
          [WOXBIN_STORAGE.selectedProfileId]: migrated.id
        });
        await storageLocalRemove([WOXBIN_STORAGE.baseUrl, WOXBIN_STORAGE.apiKey]);
      }
    }
  }

  const selectedProfileId =
    typeof data[WOXBIN_STORAGE.selectedProfileId] === "string" ? data[WOXBIN_STORAGE.selectedProfileId] : profiles[0]?.id ?? null;

  if (selectedProfileId && selectedProfileId !== data[WOXBIN_STORAGE.selectedProfileId]) {
    await storageLocalSet({ [WOXBIN_STORAGE.selectedProfileId]: selectedProfileId });
  }

  return {
    profiles,
    selectedProfileId
  };
}

export async function saveProfile({
  profileId = null,
  label,
  baseUrl,
  apiKey,
  passphrase = ""
}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (!normalizedBaseUrl) {
    throw new Error("Use https:// for hosted sites, or http://localhost / http://127.0.0.1 for local development.");
  }

  const trimmedKey = String(apiKey || "").trim();

  const state = await loadProfiles();
  const now = new Date().toISOString();
  const record = {
    id: profileId || randomId(),
    label: String(label || "").trim().slice(0, 64) || new URL(normalizedBaseUrl).hostname,
    baseUrl: normalizedBaseUrl,
    apiKey: "",
    encryptedSecret: null,
    createdAt: now,
    updatedAt: now
  };

  const existing = state.profiles.find((profile) => profile.id === record.id);
  if (existing) {
    record.createdAt = existing.createdAt;
  }

  if (trimmedKey) {
    if (passphrase) {
      record.encryptedSecret = await encryptSecret(trimmedKey, passphrase);
      passphraseCache.set(record.id, passphrase);
    } else {
      record.apiKey = trimmedKey;
      passphraseCache.delete(record.id);
    }
  } else if (existing) {
    // Keep prior credentials when user edits label/base URL only.
    record.apiKey = existing.apiKey || "";
    record.encryptedSecret = existing.encryptedSecret || null;
  }

  const profiles = state.profiles.filter((profile) => profile.id !== record.id);
  profiles.unshift(record);

  await storageLocalSet({
    [WOXBIN_STORAGE.profiles]: profiles,
    [WOXBIN_STORAGE.selectedProfileId]: record.id
  });

  return record;
}

export async function deleteProfile(profileId) {
  const state = await loadProfiles();
  const profiles = state.profiles.filter((profile) => profile.id !== profileId);
  const nextSelected = state.selectedProfileId === profileId ? profiles[0]?.id ?? null : state.selectedProfileId;
  passphraseCache.delete(profileId);
  await storageLocalSet({
    [WOXBIN_STORAGE.profiles]: profiles,
    [WOXBIN_STORAGE.selectedProfileId]: nextSelected
  });
  return { profiles, selectedProfileId: nextSelected };
}

export async function setSelectedProfileId(profileId) {
  await storageLocalSet({ [WOXBIN_STORAGE.selectedProfileId]: profileId });
}

export async function resolveProfileCredentials(profile, passphrase = "") {
  if (!profile) {
    return { baseUrl: "", apiKey: "", locked: true };
  }
  if (profile.apiKey) {
    return { baseUrl: profile.baseUrl, apiKey: profile.apiKey, locked: false };
  }
  if (!profile.encryptedSecret) {
    // No encrypted secret and no apiKey means profile exists but isn't configured yet.
    return { baseUrl: profile.baseUrl, apiKey: "", locked: false };
  }

  const cached = passphrase || passphraseCache.get(profile.id) || "";
  if (!cached) {
    return { baseUrl: profile.baseUrl, apiKey: "", locked: true };
  }

  try {
    const apiKey = await decryptSecret(profile.encryptedSecret, cached);
    passphraseCache.set(profile.id, cached);
    return { baseUrl: profile.baseUrl, apiKey, locked: false };
  } catch {
    return { baseUrl: profile.baseUrl, apiKey: "", locked: true };
  }
}

export function forgetProfilePassphrase(profileId) {
  passphraseCache.delete(profileId);
}

export async function unlockProfile(profileId, passphrase) {
  const state = await loadProfiles();
  const profile = state.profiles.find((item) => item.id === profileId) || null;
  if (!profile?.encryptedSecret) {
    return true;
  }
  const result = await resolveProfileCredentials(profile, passphrase);
  if (!result.locked) {
    passphraseCache.set(profileId, passphrase);
    return true;
  }
  return false;
}

export async function getSelectedProfile() {
  const state = await loadProfiles();
  return state.profiles.find((profile) => profile.id === state.selectedProfileId) || state.profiles[0] || null;
}
