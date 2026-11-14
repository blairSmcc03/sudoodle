import type { Board, Tally } from "./logic/leaderboard";
import type { Streak } from "./logic/streak";
import type { PendingResult, SyncApi } from "./sync";

export interface DayView {
  board: Board;
  tally: Tally;
  streak: Streak;
}

export interface LeaderboardApi extends SyncApi {
  getDay(date: string): Promise<DayView>;
}

export function createHttpApi(baseUrl: string, token: string, fetchImpl: typeof fetch = fetch): LeaderboardApi {
  const base = baseUrl.replace(/\/$/, "");
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  return {
    async postResult(result: PendingResult) {
      const response = await fetchImpl(`${base}/result`, { method: "POST", headers, body: JSON.stringify(result) });
      if (response.ok) return "ok";
      if (response.status >= 400 && response.status < 500) return "rejected";
      throw new Error(`Server error ${response.status}`);
    },
    async getDay(date: string) {
      const response = await fetchImpl(`${base}/day?date=${date}`, { headers });
      if (!response.ok) throw new Error(`Server error ${response.status}`);
      return (await response.json()) as DayView;
    },
  };
}
