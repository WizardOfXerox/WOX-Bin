import { afterEach, describe, expect, it } from "vitest";

import {
  PUBLIC_PASTE_LS,
  readWordWrapPref,
  writeWordWrapPref
} from "@/lib/public-paste-view-prefs";

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function createStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    }
  };
}

function installWindow(storage: StorageLike) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: storage
    }
  });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
});

describe("public paste word wrap preference", () => {
  it("defaults to enabled during server rendering", () => {
    expect(readWordWrapPref()).toBe(true);
  });

  it("defaults to enabled when no preference exists", () => {
    installWindow(createStorage());
    expect(readWordWrapPref()).toBe(true);
  });

  it("persists false when word wrap is disabled", () => {
    const storage = createStorage();
    installWindow(storage);

    writeWordWrapPref(false);

    expect(storage.getItem(PUBLIC_PASTE_LS.wordWrap)).toBe("0");
    expect(readWordWrapPref()).toBe(false);
  });

  it("persists true when word wrap is enabled", () => {
    const storage = createStorage();
    installWindow(storage);

    writeWordWrapPref(true);

    expect(storage.getItem(PUBLIC_PASTE_LS.wordWrap)).toBe("1");
    expect(readWordWrapPref()).toBe(true);
  });
});
