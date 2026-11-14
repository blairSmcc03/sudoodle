import { daysBetween } from "./schedule";

export interface Streak {
  count: number;
  /** YYYY-MM-DD of the last finished puzzle, or null if none yet. */
  lastDate: string | null;
}

export function recordFinish(streak: Streak, dateKey: string): Streak {
  if (streak.lastDate === dateKey) return streak;
  const continues = streak.lastDate !== null && daysBetween(streak.lastDate, dateKey) === 1;
  return { count: continues ? streak.count + 1 : 1, lastDate: dateKey };
}

/** The streak to display today: still alive if she finished yesterday or today. */
export function currentStreak(streak: Streak, todayKey: string): number {
  if (streak.lastDate === null) return 0;
  return daysBetween(streak.lastDate, todayKey) <= 1 ? streak.count : 0;
}
