import { flag } from "flags/next";

const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);
const DISABLED_VALUES = new Set(["0", "false", "no", "off"]);

function readBooleanEnv(name: string, fallback: boolean) {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) {
    return fallback;
  }
  if (ENABLED_VALUES.has(raw)) {
    return true;
  }
  if (DISABLED_VALUES.has(raw)) {
    return false;
  }
  return fallback;
}

export const publicProfileCacheFlag = flag<boolean>({
  key: "public-profile-cache",
  description: "Cache anonymous public profile snapshots on the server.",
  defaultValue: true,
  decide() {
    return readBooleanEnv("WOX_FLAG_PUBLIC_PROFILE_CACHE", true);
  },
  options: [
    { value: false, label: "Disabled" },
    { value: true, label: "Enabled" }
  ]
});

export const publicDropObjectStorageFlag = flag<boolean>({
  key: "public-drop-object-storage",
  description: "Store public file-drop payloads in object storage instead of Postgres blobs.",
  defaultValue: false,
  decide() {
    return readBooleanEnv("WOX_FLAG_PUBLIC_DROP_OBJECT_STORAGE", false);
  },
  options: [
    { value: false, label: "Database" },
    { value: true, label: "Object storage" }
  ]
});

export const profileAvatarUploadFlag = flag<boolean>({
  key: "profile-avatar-upload",
  description: "Allow uploaded profile avatars from account settings.",
  defaultValue: true,
  decide() {
    return readBooleanEnv("WOX_FLAG_PROFILE_AVATAR_UPLOAD", true);
  },
  options: [
    { value: false, label: "Disabled" },
    { value: true, label: "Enabled" }
  ]
});
