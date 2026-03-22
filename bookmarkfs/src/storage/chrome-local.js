export function storageLocalGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

export function storageLocalSet(obj) {
  return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}

export function storageLocalRemove(keys) {
  return new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
}
