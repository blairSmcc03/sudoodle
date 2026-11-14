import { describe, expect, test } from "vitest";
import { loadToken, pairFromUrl } from "./pairing";
import type { KeyValueStore } from "./logic/persistence";

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe("pairFromUrl", () => {
  test("stores the token from a setup link and returns the URL with it removed", () => {
    const store = memoryStore();
    const cleaned = pairFromUrl(store, "https://sudoodle.test/?token=abc123&as=her");
    expect(loadToken(store)).toBe("abc123");
    expect(cleaned).toBe("https://sudoodle.test/");
  });

  test("keeps unrelated query parameters and the path", () => {
    const cleaned = pairFromUrl(memoryStore(), "https://sudoodle.test/app/?x=1&token=abc&as=him#top");
    expect(cleaned).toBe("https://sudoodle.test/app/?x=1#top");
  });

  test("leaves everything alone when there is no token", () => {
    const store = memoryStore();
    expect(pairFromUrl(store, "https://sudoodle.test/?x=1")).toBeNull();
    expect(loadToken(store)).toBeNull();
  });

  test("a device with no token is simply unpaired", () => {
    expect(loadToken(memoryStore())).toBeNull();
  });

  test("an empty token is ignored", () => {
    const store = memoryStore();
    pairFromUrl(store, "https://sudoodle.test/?token=");
    expect(loadToken(store)).toBeNull();
  });

  test("pairing again replaces the old token", () => {
    const store = memoryStore();
    pairFromUrl(store, "https://sudoodle.test/?token=old");
    pairFromUrl(store, "https://sudoodle.test/?token=new");
    expect(loadToken(store)).toBe("new");
  });
});
