import { parseGrid } from "../src/logic/grid";
import { buildDifficultySchedule } from "../src/logic/difficulty";
import { daysBetween, type Difficulty, type PuzzleBatch } from "../src/logic/schedule";

export type PuzzleFetcher = (difficulty: Difficulty) => Promise<{ puzzle: string; solution: string }>;

const API_URL = "https://www.youdosudoku.com/api";
const MAX_ATTEMPTS = 3;

/** The API answers 403 (or 429) with a message when the per-minute limit is hit. */
export class RateLimitError extends Error {}

export function createApiClient(apiKey: string, fetchImpl: typeof fetch = fetch): PuzzleFetcher {
  return async (difficulty) => {
    const response = await fetchImpl(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ difficulty, solution: true, array: false }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (response.status === 429 || /requests per minute|limit/i.test(body)) {
        throw new RateLimitError(`YouDoSudoku rate limit (HTTP ${response.status})`);
      }
      throw new Error(`YouDoSudoku API returned HTTP ${response.status}`);
    }
    const data = (await response.json()) as { puzzle?: unknown; solution?: unknown };
    if (typeof data.puzzle !== "string" || typeof data.solution !== "string") {
      throw new Error("YouDoSudoku API response had no puzzle and solution");
    }
    return { puzzle: data.puzzle, solution: data.solution };
  };
}

export interface BuildOptions {
  startDate: string;
  days: number;
  random: () => number;
  fetchPuzzle: PuzzleFetcher;
  /** Minimum gap between requests. The API allows 60 a minute, so 1.1s keeps us well under. */
  intervalMs?: number;
  /** How long to wait after a rate-limit response before retrying. */
  rateLimitWaitMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function buildBatch({
  startDate,
  days,
  random,
  fetchPuzzle,
  intervalMs = 1100,
  rateLimitWaitMs = 65_000,
  sleep = realSleep,
}: BuildOptions): Promise<PuzzleBatch> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || Number.isNaN(Date.parse(`${startDate}T00:00:00Z`))) {
    throw new Error(`Invalid start date "${startDate}", expected YYYY-MM-DD`);
  }
  const schedule = buildDifficultySchedule(days, random);
  const puzzles: PuzzleBatch["puzzles"] = [];
  for (const [i, difficulty] of schedule.entries()) {
    let lastError: unknown;
    let failures = 0;
    while (failures < MAX_ATTEMPTS) {
      await sleep(intervalMs);
      try {
        const { puzzle, solution } = await fetchPuzzle(difficulty);
        parseGrid(puzzle, solution); // validates shape and consistency
        puzzles.push({ difficulty, puzzle, solution });
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        if (error instanceof RateLimitError) {
          // Waiting out the window is not a bad attempt, so it doesn't count towards the limit.
          await sleep(rateLimitWaitMs);
          continue;
        }
        failures++;
      }
    }
    if (lastError !== undefined) {
      throw new Error(`Could not get a valid ${difficulty} puzzle for day ${i + 1}: ${String(lastError)}`);
    }
  }
  return { startDate, puzzles };
}

/** Days of puzzles left, counting today. 0 once the batch has run out. */
export function remainingDays(batch: PuzzleBatch, todayKey: string): number {
  const used = Math.max(0, daysBetween(batch.startDate, todayKey));
  return Math.max(0, batch.puzzles.length - used);
}
