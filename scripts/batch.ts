import { parseGrid } from "../src/logic/grid";
import { buildDifficultySchedule } from "../src/logic/difficulty";
import { daysBetween, type Difficulty, type PuzzleBatch } from "../src/logic/schedule";

export type PuzzleFetcher = (difficulty: Difficulty) => Promise<{ puzzle: string; solution: string }>;

const API_URL = "https://www.youdosudoku.com/api";
const MAX_ATTEMPTS = 3;

export function createApiClient(apiKey: string, fetchImpl: typeof fetch = fetch): PuzzleFetcher {
  return async (difficulty) => {
    const response = await fetchImpl(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ difficulty, solution: true, array: false }),
    });
    if (!response.ok) throw new Error(`YouDoSudoku API returned HTTP ${response.status}`);
    const data = (await response.json()) as { puzzle?: unknown; solution?: unknown };
    return { puzzle: String(data.puzzle), solution: String(data.solution) };
  };
}

export interface BuildOptions {
  startDate: string;
  days: number;
  random: () => number;
  fetchPuzzle: PuzzleFetcher;
}

export async function buildBatch({ startDate, days, random, fetchPuzzle }: BuildOptions): Promise<PuzzleBatch> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || Number.isNaN(Date.parse(`${startDate}T00:00:00Z`))) {
    throw new Error(`Invalid start date "${startDate}", expected YYYY-MM-DD`);
  }
  const schedule = buildDifficultySchedule(days, random);
  const puzzles: PuzzleBatch["puzzles"] = [];
  for (const [i, difficulty] of schedule.entries()) {
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const { puzzle, solution } = await fetchPuzzle(difficulty);
        parseGrid(puzzle, solution); // validates shape and consistency
        puzzles.push({ difficulty, puzzle, solution });
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
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
