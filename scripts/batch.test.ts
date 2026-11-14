import { describe, expect, test } from "vitest";
import { buildBatch, createApiClient, remainingDays, type PuzzleFetcher } from "./batch";
import { PUZZLE, SOLUTION } from "../src/logic/fixtures";
import { seededRandom } from "../src/logic/difficulty";

const good: PuzzleFetcher = async () => ({ puzzle: PUZZLE, solution: SOLUTION });

describe("buildBatch", () => {
  test("produces one puzzle per day starting on the start date", async () => {
    const batch = await buildBatch({ startDate: "2026-12-01", days: 5, random: seededRandom(1), fetchPuzzle: good });
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
    });
    expect(batch.puzzles.map((p) => p.difficulty)).toEqual(asked);
  });

  test("never has three of the same difficulty in a row", async () => {
    const batch = await buildBatch({ startDate: "2026-12-01", days: 365, random: seededRandom(9), fetchPuzzle: good });
    const d = batch.puzzles.map((p) => p.difficulty);
    for (let i = 2; i < d.length; i++) expect(d[i] === d[i - 1] && d[i] === d[i - 2]).toBe(false);
  });

  test("retries a puzzle the API returns malformed, then succeeds", async () => {
    let calls = 0;
    const flaky: PuzzleFetcher = async () => {
      calls++;
      return calls === 1 ? { puzzle: "short", solution: SOLUTION } : { puzzle: PUZZLE, solution: SOLUTION };
    };
    const batch = await buildBatch({ startDate: "2026-12-01", days: 1, random: seededRandom(1), fetchPuzzle: flaky });
    expect(batch.puzzles).toHaveLength(1);
    expect(calls).toBe(2);
  });

  test("gives up with a clear error if the API keeps returning bad data", async () => {
    const bad: PuzzleFetcher = async () => ({ puzzle: "short", solution: SOLUTION });
    await expect(
      buildBatch({ startDate: "2026-12-01", days: 1, random: seededRandom(1), fetchPuzzle: bad }),
    ).rejects.toThrow(/day 1/i);
  });

  test("rejects a bad start date up front", async () => {
    await expect(
      buildBatch({ startDate: "01/12/2026", days: 1, random: seededRandom(1), fetchPuzzle: good }),
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
