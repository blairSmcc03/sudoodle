import { describe, expect, test } from "vitest";
import { enterDigit, newGame } from "./game";
import { PUZZLE, SOLUTION } from "./fixtures";
import { clearAll, loadSession, loadStreak, saveSession, saveStreak, type KeyValueStore, type Session } from "./persistence";

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const session = (overrides: Partial<Session> = {}): Session => ({
  date: "2026-12-05",
  game: enterDigit(newGame(PUZZLE, SOLUTION), 2, 4),
  bankedMs: 12_000,
  finished: null,
  ...overrides,
});

describe("session persistence", () => {
  test("a saved session loads back unchanged after a reload", () => {
    const store = memoryStore();
    saveSession(store, session());
    expect(loadSession(store, "2026-12-05")).toEqual(session());
  });

  test("there is nothing to load on a fresh device", () => {
    expect(loadSession(memoryStore(), "2026-12-05")).toBeNull();
  });

  test("yesterday's session is not offered today", () => {
    const store = memoryStore();
    saveSession(store, session({ date: "2026-12-04" }));
    expect(loadSession(store, "2026-12-05")).toBeNull();
  });

  test("a finished session keeps its result", () => {
    const store = memoryStore();
    const done = session({ finished: { seconds: 402, livesLost: 2 } });
    saveSession(store, done);
    expect(loadSession(store, "2026-12-05")?.finished).toEqual({ seconds: 402, livesLost: 2 });
  });

  test("corrupt saved data is ignored rather than crashing", () => {
    const store = memoryStore();
    store.setItem("sudoodle.session", "{not json");
    expect(loadSession(store, "2026-12-05")).toBeNull();
  });

  test("saved data of the wrong shape is ignored", () => {
    const store = memoryStore();
    store.setItem("sudoodle.session", JSON.stringify({ date: "2026-12-05" }));
    expect(loadSession(store, "2026-12-05")).toBeNull();
  });

  test("a store that refuses writes (private mode, quota) does not crash the game", () => {
    const store: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
    };
    expect(() => saveSession(store, session())).not.toThrow();
  });
});

describe("streak cache", () => {
  test("round-trips", () => {
    const store = memoryStore();
    saveStreak(store, { count: 4, lastDate: "2026-12-04" });
    expect(loadStreak(store)).toEqual({ count: 4, lastDate: "2026-12-04" });
  });

  test("defaults to no streak", () => {
    expect(loadStreak(memoryStore())).toEqual({ count: 0, lastDate: null });
  });
});

describe("clearAll", () => {
  test("removes session and streak", () => {
    const store = memoryStore();
    saveSession(store, session());
    saveStreak(store, { count: 1, lastDate: "2026-12-05" });
    clearAll(store);
    expect(store.data.size).toBe(0);
  });
});
