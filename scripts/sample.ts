import { PUZZLE, SOLUTION } from "../src/logic/fixtures";
import { buildDifficultySchedule, seededRandom } from "../src/logic/difficulty";
import type { PuzzleBatch } from "../src/logic/schedule";

/** Relabel digits by a seeded permutation. This keeps the puzzle valid and uniquely solvable. */
function relabel(text: string, perm: number[]): string {
  return [...text].map((c) => (c === "0" ? "0" : String(perm[Number(c) - 1]))).join("");
}

/** A throwaway batch for local development and tests, built from one known-good puzzle. */
export function buildSampleBatch(startDate: string, days: number): PuzzleBatch {
  const random = seededRandom(2026);
  const schedule = buildDifficultySchedule(days, random);
  const puzzles = schedule.map((difficulty) => {
    const perm = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = 8; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [perm[i], perm[j]] = [perm[j]!, perm[i]!];
    }
    return { difficulty, puzzle: relabel(PUZZLE, perm), solution: relabel(SOLUTION, perm) };
  });
  return { startDate, puzzles };
}
