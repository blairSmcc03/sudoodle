import type { KeyValueStore } from "./logic/persistence";

export interface PendingResult {
  date: string;
  seconds: number;
  livesLost: number;
}

/** "ok" = stored; "rejected" = the server refused it for good. Network failure throws. */
export interface SyncApi {
  postResult(result: PendingResult): Promise<"ok" | "rejected">;
}

const QUEUE_KEY = "sudoodle.queue";

export function pendingResults(store: KeyValueStore): PendingResult[] {
  try {
    const parsed: unknown = JSON.parse(store.getItem(QUEUE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as PendingResult[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(store: KeyValueStore, queue: PendingResult[]): void {
  try {
    store.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage unavailable: nothing more we can do.
  }
}

export function enqueueResult(store: KeyValueStore, result: PendingResult): void {
  const queue = pendingResults(store);
  if (queue.some((r) => r.date === result.date)) return;
  writeQueue(store, [...queue, result]);
}

let flushing: Promise<void> | null = null;

/** Sends queued results in order. Stops at the first network failure so nothing is lost. */
export function flushQueue(store: KeyValueStore, api: SyncApi): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    for (const result of pendingResults(store)) {
      try {
        await api.postResult(result);
      } catch {
        return;
      }
      writeQueue(
        store,
        pendingResults(store).filter((r) => r.date !== result.date),
      );
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}
