import type { Difficulty } from "./schedule";
import { formatTime } from "./timer";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface ShareInput {
  dateKey: string;
  difficulty: Difficulty;
  seconds: number;
  livesLost: number;
  url: string;
}

/** Spoiler-free: no puzzle digits, identical whatever the day's result against the other player. */
export function shareText({ dateKey, difficulty, seconds, livesLost, url }: ShareInput): string {
  const [, month, day] = dateKey.split("-").map(Number);
  const date = `${day} ${MONTHS[(month ?? 1) - 1]}`;
  const level = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  const lives =
    livesLost === 0 ? "💖 no lives lost" : `💔 ${livesLost} ${livesLost === 1 ? "life" : "lives"} lost`;
  return `Sudoodle · ${date} · ${level} · ⏱ ${formatTime(seconds)} · ${lives}\n${url}`;
}
