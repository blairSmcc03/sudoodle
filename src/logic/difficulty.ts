import type { Difficulty } from "./schedule";

const WEIGHTS: ReadonlyArray<readonly [Difficulty, number]> = [
  ["easy", 0.3],
  ["medium", 0.4],
  ["hard", 0.3],
];
const MAX_RUN = 2;

/** Small deterministic PRNG (mulberry32) returning floats in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A weighted-random difficulty per day, never more than MAX_RUN of the same one in a row. */
export function buildDifficultySchedule(
  days: number,
  random: () => number,
  /** Days that come immediately before the first one, oldest first (only the last MAX_RUN matter). */
  preceding: readonly Difficulty[] = [],
): Difficulty[] {
  const schedule: Difficulty[] = [...preceding];
  const skip = preceding.length;
  for (let i = 0; i < days; i++) {
    const last = schedule.slice(-MAX_RUN);
    const blocked = last.length === MAX_RUN && last.every((d) => d === last[0]) ? last[0] : undefined;
    const options = WEIGHTS.filter(([d]) => d !== blocked);
    const total = options.reduce((sum, [, w]) => sum + w, 0);
    let roll = random() * total;
    const picked = options.find(([, w]) => (roll -= w) < 0) ?? options[options.length - 1]!;
    schedule.push(picked[0]);
  }
  return schedule.slice(skip);
}

/**
 * Difficulties for `days` days that come *before* an existing schedule, never making a run of
 * more than MAX_RUN where the two meet. Built backwards from the first existing days.
 */
export function buildDifficultyScheduleBefore(
  existing: readonly Difficulty[],
  days: number,
  random: () => number,
): Difficulty[] {
  // Working backwards, a day's "previous" days are the ones that follow it in time.
  const reversed = buildDifficultySchedule(days, random, [...existing.slice(0, MAX_RUN)].reverse());
  return reversed.reverse();
}
