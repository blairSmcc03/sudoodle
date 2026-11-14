/** Foreground-only stopwatch. All times are passed in, so it is pure and testable. */
export interface Timer {
  /** Visible time banked so far. */
  bankedMs: number;
  /** When the current visible stretch began, or null if hidden or stopped. */
  runningSince: number | null;
  stopped: boolean;
}

export function startTimer(now: number, visible: boolean): Timer {
  return { bankedMs: 0, runningSince: visible ? now : null, stopped: false };
}

/** Resume a timer in a new page session with time banked by a previous one. */
export function restoreTimer(bankedMs: number, now: number, visible: boolean): Timer {
  return { bankedMs, runningSince: visible ? now : null, stopped: false };
}

export function elapsedMs(timer: Timer, now: number): number {
  return timer.bankedMs + (timer.runningSince === null ? 0 : now - timer.runningSince);
}

export function setVisible(timer: Timer, visible: boolean, now: number): Timer {
  if (timer.stopped) return timer;
  if (visible) {
    return timer.runningSince === null ? { ...timer, runningSince: now } : timer;
  }
  if (timer.runningSince === null) return timer;
  return { ...timer, bankedMs: elapsedMs(timer, now), runningSince: null };
}

export function stopTimer(timer: Timer, now: number): Timer {
  return { bankedMs: elapsedMs(timer, now), runningSince: null, stopped: true };
}

/** Active time plus penalty, rounded to whole seconds. */
export function finalSeconds(activeMs: number, penaltySeconds: number): number {
  return Math.round(activeMs / 1000) + penaltySeconds;
}

/** m:ss, or h:mm:ss for an hour or more. */
export function formatTime(totalSeconds: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
