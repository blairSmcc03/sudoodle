import type { DayResult } from "../src/logic/leaderboard";
import type { ResultStore } from "./store";

/** The slice of Cloudflare D1's API that we use. */
export interface D1Like {
  prepare(sql: string): {
    bind(...params: unknown[]): {
      run(): Promise<{ meta: { changes: number } }>;
      all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
    };
  };
}

export function d1ResultStore(db: D1Like): ResultStore {
  return {
    async saveResult(date, result) {
      const outcome = await db
        .prepare("INSERT OR IGNORE INTO results (date, player, seconds, lives_lost) VALUES (?, ?, ?, ?)")
        .bind(date, result.player, result.seconds, result.livesLost)
        .run();
      return outcome.meta.changes > 0;
    },
    async allResults() {
      const { results } = await db
        .prepare("SELECT date, player, seconds, lives_lost FROM results ORDER BY date, player")
        .bind()
        .all<{ date: string; player: "her" | "him"; seconds: number; lives_lost: number }>();
      const days: Record<string, DayResult[]> = {};
      for (const row of results) {
        (days[row.date] ??= []).push({ player: row.player, seconds: row.seconds, livesLost: row.lives_lost });
      }
      return days;
    },
  };
}
