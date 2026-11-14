import type { GameState } from "./game";
import type { Streak } from "./streak";

/** The subset of the Web Storage API we use, so tests can pass an in-memory store. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface Session {
  /** Europe/London date of the puzzle being played. */
  date: string;
  game: GameState;
  /** Foreground time banked so far (restored after a reload). */
  bankedMs: number;
  /** Set once the puzzle is complete; the puzzle is then locked. */
  finished: { seconds: number; livesLost: number } | null;
}

const SESSION_KEY = "sudoodle.session";
const STREAK_KEY = "sudoodle.streak";

function safeSet(store: KeyValueStore, key: string, value: string): void {
  try {
    store.setItem(key, value);
  } catch {
    // Storage full or unavailable: the game keeps working, it just won't survive a reload.
  }
}

function safeRead(store: KeyValueStore, key: string): unknown {
  try {
    const raw = store.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function isSession(value: unknown): value is Session {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const game = v.game as Record<string, unknown> | undefined;
  return (
    typeof v.date === "string" &&
    typeof v.bankedMs === "number" &&
    typeof game === "object" &&
    game !== null &&
    typeof game.hearts === "number" &&
    Array.isArray(game.notes) &&
    Array.isArray(game.history) &&
    typeof game.grid === "object"
  );
}

export function saveSession(store: KeyValueStore, session: Session): void {
  safeSet(store, SESSION_KEY, JSON.stringify(session));
}

/** Today's saved session, or null if there is none (or it belongs to another day). */
export function loadSession(store: KeyValueStore, dateKey: string): Session | null {
  const value = safeRead(store, SESSION_KEY);
  return isSession(value) && value.date === dateKey ? value : null;
}

export function saveStreak(store: KeyValueStore, streak: Streak): void {
  safeSet(store, STREAK_KEY, JSON.stringify(streak));
}

export function loadStreak(store: KeyValueStore): Streak {
  const value = safeRead(store, STREAK_KEY) as Partial<Streak> | null;
  if (value && typeof value.count === "number" && (typeof value.lastDate === "string" || value.lastDate === null)) {
    return { count: value.count, lastDate: value.lastDate };
  }
  return { count: 0, lastDate: null };
}

export function clearAll(store: KeyValueStore): void {
  store.removeItem(SESSION_KEY);
  store.removeItem(STREAK_KEY);
}
