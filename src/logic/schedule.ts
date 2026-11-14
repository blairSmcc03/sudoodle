const TIME_ZONE = "Europe/London";

const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The Europe/London calendar date (YYYY-MM-DD) at the given instant. */
export function londonDateKey(instant: Date): string {
  return dateFormat.format(instant);
}

export type Difficulty = "easy" | "medium" | "hard";

export interface DailyPuzzle {
  difficulty: Difficulty;
  puzzle: string;
  solution: string;
}

export interface PuzzleBatch {
  /** YYYY-MM-DD (Europe/London) of the first puzzle. */
  startDate: string;
  puzzles: DailyPuzzle[];
}

export type PuzzleLookup =
  | { status: "ready"; puzzle: DailyPuzzle }
  | { status: "not-started"; startDate: string }
  | { status: "exhausted" };

const MS_PER_DAY = 86_400_000;

/** Whole days from one YYYY-MM-DD key to another. Uses UTC midnights, so clock changes can't interfere. */
export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / MS_PER_DAY);
}

export function puzzleForDate(batch: PuzzleBatch, dateKey: string): PuzzleLookup {
  const day = daysBetween(batch.startDate, dateKey);
  if (day < 0) return { status: "not-started", startDate: batch.startDate };
  const puzzle = batch.puzzles[day];
  return puzzle ? { status: "ready", puzzle } : { status: "exhausted" };
}
