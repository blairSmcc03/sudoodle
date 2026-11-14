export type Player = "her" | "him";

export interface DayResult {
  player: Player;
  /** Final time in seconds, including penalties. */
  seconds: number;
  livesLost: number;
}

export type Outcome = "you" | "other" | "draw";

export type Board =
  | { state: "locked"; otherFinished: boolean }
  | { state: "waiting"; you: DayResult }
  | { state: "complete"; you: DayResult; other: DayResult; outcome: Outcome };

/**
 * What a player may see for one day. Spoiler-free: nothing about the other player's
 * result is revealed until the viewer has finished (only whether they have).
 */
export function boardFor(you: DayResult | undefined, other: DayResult | undefined): Board {
  if (!you) return { state: "locked", otherFinished: other !== undefined };
  if (!other) return { state: "waiting", you };
  const outcome: Outcome = you.seconds < other.seconds ? "you" : you.seconds > other.seconds ? "other" : "draw";
  return { state: "complete", you, other, outcome };
}

export interface Tally {
  her: number;
  him: number;
  draws: number;
}

/** Wins by day. A draw counts for nobody. Days with only one finisher are ignored. */
export function tally(days: Record<string, DayResult[]>): Tally {
  const result: Tally = { her: 0, him: 0, draws: 0 };
  for (const results of Object.values(days)) {
    const her = results.find((x) => x.player === "her");
    const him = results.find((x) => x.player === "him");
    if (!her || !him) continue;
    if (her.seconds < him.seconds) result.her++;
    else if (him.seconds < her.seconds) result.him++;
    else result.draws++;
  }
  return result;
}
