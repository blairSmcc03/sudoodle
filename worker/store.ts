import type { DayResult, Player } from "../src/logic/leaderboard";

/** Where results live. Cloudflare D1 in production, memory in tests. */
export interface ResultStore {
  /** Stores a result unless that player already has one for the date. Returns whether it was stored. */
  saveResult(date: string, result: DayResult): Promise<boolean>;
  /** Every stored result, grouped by date. */
  allResults(): Promise<Record<string, DayResult[]>>;
}

export type { Player };
