"use client";

export type RememberedAuthProvider = "credentials" | "google" | "email";

export type RememberedAccount = {
  id: string;
  username: string | null;
  displayName: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
  preferredProvider: RememberedAuthProvider | null;
  lastUsedAt: string;
};

type PendingRememberedAccount = {
  provider: RememberedAuthProvider | null;
};

const REMEMBERED_ACCOUNTS_STORAGE_KEY = "woxbin_remembered_accounts";
const REMEMBERED_ACCOUNTS_PENDING_KEY = "woxbin_remembered_accounts_pending";
const REMEMBERED_ACCOUNTS_PREFERENCE_KEY = "woxbin_remember_account_preference";
const REMEMBERED_ACCOUNTS_LIMIT = 6;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeImage(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

function safeParseArray(raw: string | null): RememberedAccount[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((entry): entry is Partial<RememberedAccount> & { id: string } => {
        return typeof entry === "object" && entry !== null && typeof entry.id === "string" && entry.id.trim().length > 0;
      })
      .map((entry) => ({
        id: entry.id,
        username: typeof entry.username === "string" ? entry.username : null,
        displayName: typeof entry.displayName === "string" ? entry.displayName : null,
        name: typeof entry.name === "string" ? entry.name : null,
        email: typeof entry.email === "string" ? entry.email : null,
        image: normalizeImage(typeof entry.image === "string" ? entry.image : null),
        preferredProvider:
          entry.preferredProvider === "credentials" ||
          entry.preferredProvider === "google" ||
          entry.preferredProvider === "email"
            ? entry.preferredProvider
            : null,
        lastUsedAt:
          typeof entry.lastUsedAt === "string" && entry.lastUsedAt.trim()
            ? entry.lastUsedAt
            : new Date().toISOString()
      }));
  } catch {
    return [];
  }
}

function writeRememberedAccounts(entries: RememberedAccount[]) {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(
    REMEMBERED_ACCOUNTS_STORAGE_KEY,
    JSON.stringify(entries.slice(0, REMEMBERED_ACCOUNTS_LIMIT))
  );
}

function mergeRememberedAccount(
  entries: RememberedAccount[],
  next: Omit<RememberedAccount, "lastUsedAt"> & { lastUsedAt?: string }
) {
  const merged: RememberedAccount = {
    ...next,
    image: normalizeImage(next.image),
    lastUsedAt: next.lastUsedAt ?? new Date().toISOString()
  };
  return [merged, ...entries.filter((entry) => entry.id !== merged.id)].slice(0, REMEMBERED_ACCOUNTS_LIMIT);
}

export function readRememberedAccounts(): RememberedAccount[] {
  if (!canUseStorage()) {
    return [];
  }
  return safeParseArray(window.localStorage.getItem(REMEMBERED_ACCOUNTS_STORAGE_KEY)).sort(
    (left, right) => new Date(right.lastUsedAt).getTime() - new Date(left.lastUsedAt).getTime()
  );
}

export function saveRememberedAccount(
  account: Omit<RememberedAccount, "lastUsedAt"> & { lastUsedAt?: string }
) {
  if (!canUseStorage()) {
    return;
  }
  const next = mergeRememberedAccount(readRememberedAccounts(), account);
  writeRememberedAccounts(next);
}

export function refreshRememberedAccount(account: Omit<RememberedAccount, "lastUsedAt"> & { lastUsedAt?: string }) {
  if (!canUseStorage()) {
    return;
  }
  const current = readRememberedAccounts();
  if (!current.some((entry) => entry.id === account.id)) {
    return;
  }
  writeRememberedAccounts(mergeRememberedAccount(current, account));
}

export function forgetRememberedAccount(accountId: string) {
  if (!canUseStorage()) {
    return;
  }
  writeRememberedAccounts(readRememberedAccounts().filter((entry) => entry.id !== accountId));
}

export function readRememberAccountPreference() {
  if (!canUseStorage()) {
    return false;
  }
  return window.localStorage.getItem(REMEMBERED_ACCOUNTS_PREFERENCE_KEY) === "1";
}

export function writeRememberAccountPreference(enabled: boolean) {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(REMEMBERED_ACCOUNTS_PREFERENCE_KEY, enabled ? "1" : "0");
}

export function queueRememberedAccountSave(provider: RememberedAuthProvider | null) {
  if (!canUseStorage()) {
    return;
  }
  const payload: PendingRememberedAccount = { provider };
  window.localStorage.setItem(REMEMBERED_ACCOUNTS_PENDING_KEY, JSON.stringify(payload));
}

export function clearRememberedAccountQueue() {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.removeItem(REMEMBERED_ACCOUNTS_PENDING_KEY);
}

export function consumeRememberedAccountQueue(): PendingRememberedAccount | null {
  if (!canUseStorage()) {
    return null;
  }
  const raw = window.localStorage.getItem(REMEMBERED_ACCOUNTS_PENDING_KEY);
  window.localStorage.removeItem(REMEMBERED_ACCOUNTS_PENDING_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<PendingRememberedAccount>;
    return {
      provider:
        parsed.provider === "credentials" || parsed.provider === "google" || parsed.provider === "email"
          ? parsed.provider
          : null
    };
  } catch {
    return null;
  }
}
