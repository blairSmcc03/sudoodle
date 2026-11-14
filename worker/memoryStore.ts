import type { DayResult } from "../src/logic/leaderboard";
import type { ResultStore } from "./store";

export function memoryResultStore(): ResultStore {
  const days: Record<string, DayResult[]> = {};
  return {
    async saveResult(date, result) {
      const list = (days[date] ??= []);
      if (list.some((r) => r.player === result.player)) return false;
      list.push(result);
      return true;
    },
    async allResults() {
      return structuredClone(days);
    },
  };
}
