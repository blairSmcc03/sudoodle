import { describe, expect, test } from "vitest";
import { buildBatch, createApiClient, prependDays, RateLimitError, remainingDays, type PuzzleFetcher } from "./batch";
import { PUZZLE, SOLUTION } from "../src/logic/fixtures";
import { seededRandom } from "../src/logic/difficulty";

const good: PuzzleFetcher = async () => ({ puzzle: PUZZLE, solution: SOLUTION });
/** Tests never really wait: pacing and back-off are checked by recording the requested delays. */
const noWait = { intervalMs: 0, rateLimitWaitMs: 0, sleep: async () => {} };

describe("buildBatch", () => {
  test("produces one puzzle per day starting on the start date", async () => {
    const batch = await buildBatch({ startDate: "2026-12-01", days: 5, random: seededRandom(1), fetchPuzzle: good, ...noWait });
    expect(batch.startDate).toBe("2026-12-01");
    expect(batch.puzzles).toHaveLength(5);
  });

  test("asks the API for the difficulty scheduled for each day", async () => {
    const asked: string[] = [];
    const batch = await buildBatch({
      startDate: "2026-12-01",
      days: 20,
      random: seededRandom(3),
      fetchPuzzle: async (difficulty) => {
        asked.push(difficulty);
        return { puzzle: PUZZLE, solution: SOLUTION };
      },
      ...noWait,
    });
    expect(batch.puzzles.map((p) => p.difficulty)).toEqual(asked);
  });

  test("never has three of the same difficulty in a row", async () => {
    const batch = await buildBatch({ startDate: "2026-12-01", days: 365, random: seededRandom(9), fetchPuzzle: good, ...noWait });
    const d = batch.puzzles.map((p) => p.difficulty);
    for (let i = 2; i < d.length; i++) expect(d[i] === d[i - 1] && d[i] === d[i - 2]).toBe(false);
  });

  test("retries a puzzle the API returns malformed, then succeeds", async () => {
    let calls = 0;
    const flaky: PuzzleFetcher = async () => {
      calls++;
      return calls === 1 ? { puzzle: "short", solution: SOLUTION } : { puzzle: PUZZLE, solution: SOLUTION };
    };
    const batch = await buildBatch({ startDate: "2026-12-01", days: 1, random: seededRandom(1), fetchPuzzle: flaky, ...noWait });
    expect(batch.puzzles).toHaveLength(1);
    expect(calls).toBe(2);
  });

  test("paces requests so the per-minute limit is not hit", async () => {
    const waits: number[] = [];
    await buildBatch({
      startDate: "2026-12-01",
      days: 3,
      random: seededRandom(1),
      fetchPuzzle: good,
      intervalMs: 1100,
      sleep: async (ms) => void waits.push(ms),
    });
    expect(waits).toEqual([1100, 1100, 1100]);
  });

  test("waits out a rate-limit response and then succeeds, without using up an attempt", async () => {
    const waits: number[] = [];
    let calls = 0;
    const flaky: PuzzleFetcher = async (difficulty) => {
      calls++;
      if (calls <= 5) throw new RateLimitError("limit");
      return good(difficulty);
    };
    const batch = await buildBatch({
      startDate: "2026-12-01",
      days: 1,
      random: seededRandom(1),
      fetchPuzzle: flaky,
      rateLimitWaitMs: 65_000,
      sleep: async (ms) => void waits.push(ms),
    });
    expect(batch.puzzles).toHaveLength(1);
    expect(calls).toBe(6);
    expect(waits.filter((ms) => ms === 65_000)).toHaveLength(5);
  });

  test("gives up with a clear error if the API keeps returning bad data", async () => {
    const bad: PuzzleFetcher = async () => ({ puzzle: "short", solution: SOLUTION });
    await expect(
      buildBatch({ startDate: "2026-12-01", days: 1, random: seededRandom(1), fetchPuzzle: bad, ...noWait }),
    ).rejects.toThrow(/day 1/i);
  });

  test("rejects a bad start date up front", async () => {
    await expect(
      buildBatch({ startDate: "01/12/2026", days: 1, random: seededRandom(1), fetchPuzzle: good, ...noWait }),
    ).rejects.toThrow(/start date/i);
  });
});

describe("createApiClient", () => {
  test("posts the difficulty with the key header and parses the strings", async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response(JSON.stringify({ puzzle: PUZZLE, solution: SOLUTION }), { status: 200 });
    }) as unknown as typeof fetch;
    const fetchPuzzle = createApiClient("secret-key", fetchImpl);
    expect(await fetchPuzzle("hard")).toEqual({ puzzle: PUZZLE, solution: SOLUTION });
    expect(seen?.url).toBe("https://www.youdosudoku.com/api");
    expect((seen?.init.headers as Record<string, string>)["x-api-key"]).toBe("secret-key");
    expect(JSON.parse(seen?.init.body as string)).toEqual({ difficulty: "hard", solution: true, array: false });
  });

  test("throws on an HTTP error, mentioning the status", async () => {
    const fetchImpl = (async () => new Response('{"error":"Invalid API key."}', { status: 401 })) as unknown as typeof fetch;
    await expect(createApiClient("bad", fetchImpl)("easy")).rejects.toThrow(/401/);
  });

  test("a 403 with the per-minute message is a rate limit, not a bad key", async () => {
    const fetchImpl = (async () =>
      new Response('{"error":"The included API key has reached its limit of 60 requests per minute."}', { status: 403 })) as unknown as typeof fetch;
    await expect(createApiClient("k", fetchImpl)("easy")).rejects.toBeInstanceOf(RateLimitError);
  });

  test("a missing key (400) fails with the API's message, not a parse error", async () => {
    const fetchImpl = (async () => new Response('{"error":"Missing API key."}', { status: 400 })) as unknown as typeof fetch;
    await expect(createApiClient("", fetchImpl)("easy")).rejects.toThrow(/400/);
  });

  test("a success response with no puzzle field is rejected", async () => {
    const fetchImpl = (async () => new Response(JSON.stringify({ solution: SOLUTION }), { status: 200 })) as unknown as typeof fetch;
    await expect(createApiClient("k", fetchImpl)("easy")).rejects.toThrow(/puzzle/);
  });

  test("a non-JSON success body is rejected", async () => {
    const fetchImpl = (async () => new Response("<html>nope</html>", { status: 200 })) as unknown as typeof fetch;
    await expect(createApiClient("k", fetchImpl)("easy")).rejects.toThrow();
  });

  test("a network failure is surfaced, not swallowed", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    await expect(createApiClient("k", fetchImpl)("easy")).rejects.toThrow(/fetch failed/);
  });
});

describe("remainingDays", () => {
  const batch = { startDate: "2026-12-01", puzzles: new Array(365).fill(null) };

  test("counts days left including today", () => {
    expect(remainingDays(batch, "2026-12-01")).toBe(365);
    expect(remainingDays(batch, "2027-11-30")).toBe(1);
  });

  test("is 0 once the batch has run out, and never negative", () => {
    expect(remainingDays(batch, "2027-12-01")).toBe(0);
    expect(remainingDays(batch, "2030-01-01")).toBe(0);
  });

  test("before the start date, it is the whole batch", () => {
    expect(remainingDays(batch, "2026-01-01")).toBe(365);
  });
});

describe("prependDays", () => {
  const existing = {
    startDate: "2026-12-01",
    puzzles: [
      { difficulty: "medium" as const, puzzle: PUZZLE, solution: SOLUTION },
      { difficulty: "hard" as const, puzzle: PUZZLE, solution: SOLUTION },
    ],
  };

  test("fills the days from the new start date up to the old one, keeping the old puzzles after", async () => {
    const batch = await prependDays(existing, "2026-11-20", { random: seededRandom(1), fetchPuzzle: good, ...noWait });
    expect(batch.startDate).toBe("2026-11-20");
    expect(batch.puzzles).toHaveLength(11 + 2);
    expect(batch.puzzles.slice(11)).toEqual(existing.puzzles);
  });

  test("leaves the batch unchanged when the new start date is not earlier", async () => {
    const same = await prependDays(existing, "2026-12-01", { random: seededRandom(1), fetchPuzzle: good, ...noWait });
    const later = await prependDays(existing, "2026-12-05", { random: seededRandom(1), fetchPuzzle: good, ...noWait });
    expect(same).toEqual(existing);
    expect(later).toEqual(existing);
  });

  test("does not mutate the batch it was given", async () => {
    const copy = structuredClone(existing);
    await prependDays(existing, "2026-11-20", { random: seededRandom(1), fetchPuzzle: good, ...noWait });
    expect(existing).toEqual(copy);
  });

  test("never creates three of a kind across the join", async () => {
    const hardStart = { ...existing, puzzles: [{ ...existing.puzzles[1]! }, { ...existing.puzzles[1]! }] };
    for (let seed = 1; seed <= 100; seed++) {
      const b = await prependDays(hardStart, "2026-11-29", { random: seededRandom(seed), fetchPuzzle: good, ...noWait });
      expect(b.puzzles.slice(0, 3).map((p) => p.difficulty)).not.toEqual(["hard", "hard", "hard"]);
    }
  });

  test("rejects a bad start date", async () => {
    await expect(
      prependDays(existing, "20/11/2026", { random: seededRandom(1), fetchPuzzle: good, ...noWait }),
    ).rejects.toThrow(/start date/i);
  });
});
