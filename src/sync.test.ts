import { describe, expect, test } from "vitest";
import { enqueueResult, flushQueue, pendingResults, type SyncApi } from "./sync";
import type { KeyValueStore } from "./logic/persistence";

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

function fakeApi(behaviour: "ok" | "offline" | "rejected"): SyncApi & { sent: unknown[] } {
  const sent: unknown[] = [];
  return {
    sent,
    async postResult(result) {
      if (behaviour === "offline") throw new TypeError("Failed to fetch");
      sent.push(result);
      return behaviour === "ok" ? "ok" : "rejected";
    },
  };
}

const result = (date: string) => ({ date, seconds: 300, livesLost: 1 });

describe("offline result queue", () => {
  test("a queued result is sent on flush and then removed", async () => {
    const store = memoryStore();
    const api = fakeApi("ok");
    enqueueResult(store, result("2026-12-05"));
    await flushQueue(store, api);
    expect(api.sent).toEqual([result("2026-12-05")]);
    expect(pendingResults(store)).toEqual([]);
  });

  test("while offline the result stays queued", async () => {
    const store = memoryStore();
    enqueueResult(store, result("2026-12-05"));
    await flushQueue(store, fakeApi("offline"));
    expect(pendingResults(store)).toEqual([result("2026-12-05")]);
  });

  test("it is delivered on a later flush once back online", async () => {
    const store = memoryStore();
    enqueueResult(store, result("2026-12-05"));
    await flushQueue(store, fakeApi("offline"));
    const online = fakeApi("ok");
    await flushQueue(store, online);
    expect(online.sent).toHaveLength(1);
    expect(pendingResults(store)).toEqual([]);
  });

  test("the queue survives a reload (it lives in storage)", () => {
    const store = memoryStore();
    enqueueResult(store, result("2026-12-05"));
    expect(pendingResults(store)).toEqual([result("2026-12-05")]);
  });

  test("a result the server permanently rejects is dropped, not retried forever", async () => {
    const store = memoryStore();
    enqueueResult(store, result("2026-12-05"));
    await flushQueue(store, fakeApi("rejected"));
    expect(pendingResults(store)).toEqual([]);
  });

  test("enqueueing the same date twice keeps a single entry", () => {
    const store = memoryStore();
    enqueueResult(store, result("2026-12-05"));
    enqueueResult(store, result("2026-12-05"));
    expect(pendingResults(store)).toHaveLength(1);
  });

  test("one offline failure stops the flush but keeps every later result queued", async () => {
    const store = memoryStore();
    enqueueResult(store, result("2026-12-04"));
    enqueueResult(store, result("2026-12-05"));
    await flushQueue(store, fakeApi("offline"));
    expect(pendingResults(store)).toHaveLength(2);
  });

  test("overlapping flushes do not send the same result twice", async () => {
    const store = memoryStore();
    const api = fakeApi("ok");
    enqueueResult(store, result("2026-12-05"));
    await Promise.all([flushQueue(store, api), flushQueue(store, api)]);
    expect(api.sent).toHaveLength(1);
  });
});
