import { useEffect, useRef, useState } from "preact/hooks";
import { Board } from "./components/Board";
import { Corgi } from "./components/Corgi";
import { Hearts } from "./components/Hearts";
import { NumberPad } from "./components/NumberPad";
import { completedUnits, corgiPose, type Unit } from "./logic/corgi";
import { eraseCell, enterDigit, isWon, newGame, toggleNote, undo, type GameState } from "./logic/game";
import { loadSession, saveSession, type KeyValueStore } from "./logic/persistence";
import { londonDateKey, puzzleForDate, type PuzzleBatch } from "./logic/schedule";

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
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function prettyDate(key: string): string {
  const [, m, d] = key.split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]}`;
}

export function App({ batch, config, clock, store }: AppProps) {
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
  return <Day {...{ today, config, clock, store }} daily={lookup.puzzle} />;
}

interface DayProps {
  today: string;
  daily: { difficulty: "easy" | "medium" | "hard"; puzzle: string; solution: string };
  config: AppConfig;
  clock: () => Date;
  store: KeyValueStore;
}

function Day({ today, daily, config, clock, store }: DayProps) {
  const saved = useRef(loadSession(store, today)).current;
  const [started, setStarted] = useState(saved !== null);
  const [game, setGame] = useState<GameState>(() => saved?.game ?? newGame(daily.puzzle, daily.solution));
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [shake, setShake] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [overlay, setOverlay] = useState(false);

  useEffect(() => {
    if (started) saveSession(store, { date: today, game, bankedMs: 0, finished: null });
  }, [game, started]);

  const apply = (next: GameState) => {
    setUnits(completedUnits(game.grid, next.grid));
    setShake(next.event?.type === "mistake" || next.event?.type === "heartsDepleted");
    setOverlay(next.event?.type === "heartsDepleted");
    setGame(next);
  };

  const onDigit = (digit: number) => {
    if (selected === null) return;
    apply(notesMode ? toggleNote(game, selected, digit) : enterDigit(game, selected, digit));
  };

  if (!started) {
    return (
      <main class="screen">
        <Corgi pose="idle" size="large" />
        <h1>Hi {config.names.her}! 💗</h1>
        <p class="difficulty">Today's puzzle is {daily.difficulty}</p>
        <button type="button" class="primary" onClick={() => setStarted(true)}>
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
      <Board
        state={game}
        selected={selected}
        shake={shake}
        onSelect={setSelected}
      />
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
      {isWon(game) && null}
    </main>
  );
}
