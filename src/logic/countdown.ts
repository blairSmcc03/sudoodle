import { londonDateKey } from "./schedule";

const MS_PER_HOUR = 3_600_000;

/**
 * Milliseconds until the Europe/London date next changes. Found by searching for the flip
 * (rather than adding 24h) so it is exact on the 23h and 25h clock-change days.
 */
export function msUntilNextLondonMidnight(now: Date): number {
  const today = londonDateKey(now);
  let low = now.getTime(); // still `today`
  let high = low + 26 * MS_PER_HOUR; // always a later date
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (londonDateKey(new Date(mid)) === today) low = mid;
    else high = mid;
  }
  return high - now.getTime();
}

/** hh:mm:ss, rounding partial seconds up. Hours may exceed 24 on a clock-change day. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${pad(hours)}:${pad(minutes)}:${pad(totalSeconds % 60)}`;
}
