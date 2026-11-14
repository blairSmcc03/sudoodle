import { useEffect, useRef, useState } from "preact/hooks";
import { Board } from "./components/Board";
import { Corgi } from "./components/Corgi";
import { Hearts } from "./components/Hearts";
import { NumberPad } from "./components/NumberPad";
import { completedUnits, corgiPose, type Unit } from "./logic/corgi";
import { eraseCell, enterDigit, isWon, newGame, toggleNote, undo, type GameState } from "./logic/game";
import { loadSession, loadStreak, saveSession, saveStreak, type KeyValueStore } from "./logic/persistence";
import { londonDateKey, puzzleForDate, type PuzzleBatch } from "./logic/schedule";
import { shareText } from "./logic/share";
import { currentStreak, recordFinish } from "./logic/streak";
import {
  elapsedMs,
  finalSeconds,
  restoreTimer,
  setVisible,
  startTimer,
  stopTimer,
  type Timer,
} from "./logic/timer";
import type { DayView, LeaderboardApi } from "./api";
import { Results } from "./components/Results";
import { enqueueResult, flushQueue, pendingResults } from "./sync";

export interface AppConfig {
  names: { her: string; him: string };
  completionMessages: string[];
  siteUrl: string;
}

export interface AppProps {
  batch: PuzzleBatch;
  config: AppConfig;
  clock: () => Date;
  store: KeyValueStore;
  /** Present only on a device paired with a player token. */
  api?: LeaderboardApi;
  /** Opens the system share sheet, if the browser has one. */
  share?: (text: string) => Promise<void>;
  /** Copies text to the clipboard (fallback when there is no share sheet). */
  copy?: (text: string) => Promise<void>;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function prettyDate(key: string): string {
  const [, m, d] = key.split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]}`;
}

export function App(props: AppProps) {
  const { batch, config, clock, store } = props;
  const today = londonDateKey(clock());
  const lookup = puzzleForDate(batch, today);

  if (lookup.status === "not-started") {
    return (
      <main class="screen">
        <Corgi pose="idle" size="large" />
        <h1>Coming soon 🐾</h1>
        <p>Your first puzzle arrives on {prettyDate(lookup.startDate)}.</p>
      </main>
    );
  }
  if (lookup.status === "exhausted") {
    return (
      <main class="screen">
        <Corgi pose="idle" size="large" />
        <h1>New puzzles are on their way 💌</h1>
        <p>Check back soon!</p>
      </main>
    );
  }
  return <Day {...props} today={today} daily={lookup.puzzle} />;
}

interface DayProps extends AppProps {
  today: string;
  daily: { difficulty: "easy" | "medium" | "hard"; puzzle: string; solution: string };
}

const isVisible = () => typeof document === "undefined" || document.visibilityState !== "hidden";

function messageFor(messages: string[], dateKey: string): string {
  if (messages.length === 0) return "You did it! 🐾";
  const n = [...dateKey].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return messages[n % messages.length] ?? messages[0]!;
}

function Day({ today, daily, config, clock, store, api, share, copy }: DayProps) {
  const saved = useRef(loadSession(store, today)).current;
  const [started, setStarted] = useState(saved !== null);
  const [game, setGame] = useState<GameState>(() => saved?.game ?? newGame(daily.puzzle, daily.solution));
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [shake, setShake] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [overlay, setOverlay] = useState(false);
  const [finished, setFinished] = useState(saved?.finished ?? null);
  const [justFinished, setJustFinished] = useState(false);
  const [view, setView] = useState<DayView | null>(null);
  const [syncPending, setSyncPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localStreak, setLocalStreak] = useState(() => loadStreak(store));
  const timer = useRef<Timer | null>(
    saved && !saved.finished ? restoreTimer(saved.bankedMs, clock().getTime(), isVisible()) : null,
  );

  const persist = (g: GameState, done: typeof finished) => {
    const t = timer.current;
    saveSession(store, {
      date: today,
      game: g,
      bankedMs: t ? elapsedMs(t, clock().getTime()) : 0,
      finished: done,
    });
  };

  // Keep the foreground-only stopwatch honest, and save when the page is hidden or closed.
  useEffect(() => {
    const onVisibility = () => {
      if (!timer.current) return;
      timer.current = setVisible(timer.current, isVisible(), clock().getTime());
      if (!isVisible() && !finished) persist(game, null);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onVisibility);
    };
  });

  useEffect(() => {
    if (started && !finished) persist(game, null);
  }, [game, started, selected]);

  // After finishing: send the result (queued if offline), then fetch the leaderboard.
  useEffect(() => {
    if (!finished || !api) return;
    let cancelled = false;
    const sync = async () => {
      enqueueResult(store, { date: today, seconds: finished.seconds, livesLost: finished.livesLost });
      await flushQueue(store, api);
      if (cancelled) return;
      setSyncPending(pendingResults(store).length > 0);
      try {
        const next = await api.getDay(today);
        if (!cancelled) setView(next);
      } catch {
        // Offline: the result stays queued and the page says so.
      }
    };
    void sync();
    window.addEventListener("online", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("online", sync);
    };
  }, [finished]);

  const finish = (won: GameState) => {
    const now = clock().getTime();
    const stopped = stopTimer(timer.current ?? startTimer(now, true), now);
    timer.current = stopped;
    const result = {
      seconds: finalSeconds(elapsedMs(stopped, now), won.penaltySeconds),
      livesLost: won.livesLost,
    };
    const streak = recordFinish(localStreak, today);
    saveStreak(store, streak);
    setLocalStreak(streak);
    persist(won, result);
    setJustFinished(true);
    setFinished(result);
  };

  const apply = (next: GameState) => {
    setUnits(completedUnits(game.grid, next.grid));
    setShake(next.event?.type === "mistake" || next.event?.type === "heartsDepleted");
    setOverlay(next.event?.type === "heartsDepleted");
    setGame(next);
    if (isWon(next)) finish(next);
  };

  const onDigit = (digit: number) => {
    if (selected === null) return;
    apply(notesMode ? toggleNote(game, selected, digit) : enterDigit(game, selected, digit));
  };

  const begin = () => {
    timer.current = startTimer(clock().getTime(), isVisible());
    setStarted(true);
  };

  const onShare = async () => {
    if (!finished) return;
    const text = shareText({
      dateKey: today,
      difficulty: daily.difficulty,
      seconds: finished.seconds,
      livesLost: finished.livesLost,
      url: config.siteUrl,
    });
    try {
      if (share) {
        await share(text);
      } else if (copy) {
        await copy(text);
        setCopied(true);
      }
    } catch {
      // The person dismissed the share sheet; nothing to do.
    }
  };

  if (finished) {
    const board = view?.board;
    return (
      <Results
        me={config.names.her}
        them={config.names.him}
        names={config.names}
        difficulty={daily.difficulty}
        seconds={finished.seconds}
        livesLost={finished.livesLost}
        message={messageFor(config.completionMessages, today)}
        view={board ? view : null}
        syncPending={syncPending}
        paired={api !== undefined}
        streak={view ? currentStreak(view.streak, today) : currentStreak(localStreak, today)}
        confetti={justFinished}
        copied={copied}
        clock={clock}
        onShare={onShare}
      />
    );
  }

  if (!started) {
    return (
      <main class="screen">
        <Corgi pose="idle" size="large" />
        <h1>Hi {config.names.her}! 💗</h1>
        <p class="difficulty">Today's puzzle is {daily.difficulty}</p>
        <button type="button" class="primary" onClick={begin}>
          Start
        </button>
      </main>
    );
  }

  return (
    <main class="play">
      <header class="top">
        <span class="badge">{daily.difficulty}</span>
        <Hearts hearts={game.hearts} />
        <Corgi pose={corgiPose(game, units)} />
      </header>
      <Board state={game} selected={selected} shake={shake} onSelect={setSelected} />
      <div class="controls">
        <button type="button" onClick={() => apply(undo(game))}>
          Undo
        </button>
        <button type="button" onClick={() => selected !== null && apply(eraseCell(game, selected))}>
          Erase
        </button>
        <button type="button" aria-pressed={notesMode} onClick={() => setNotesMode(!notesMode)}>
          Notes
        </button>
      </div>
      <NumberPad state={game} onDigit={onDigit} />
      {overlay && (
        <div role="dialog" aria-modal="true" class="overlay">
          <Corgi pose="sad" size="large" />
          <h2>Out of hearts!</h2>
          <p>+30s, here's one back 💗</p>
          <button type="button" class="primary" onClick={() => setOverlay(false)}>
            Keep going
          </button>
        </div>
      )}
    </main>
  );
}
