import { useEffect, useState } from "preact/hooks";
import type { DayView } from "../api";
import { formatCountdown, msUntilNextLondonMidnight } from "../logic/countdown";
import { formatTime } from "../logic/timer";
import { Confetti } from "./Confetti";
import { Corgi } from "./Corgi";

export interface ResultsProps {
  me: string;
  them: string;
  /** Names in her/him order, for the running tally. */
  names: { her: string; him: string };
  difficulty: string;
  seconds: number;
  livesLost: number;
  message: string;
  view: DayView | null;
  /** True when we have a paired device but the result hasn't reached the server yet. */
  syncPending: boolean;
  paired: boolean;
  streak: number;
  confetti: boolean;
  copied: boolean;
  clock: () => Date;
  onShare(): void;
}

function Countdown({ clock }: { clock: () => Date }) {
  const [now, setNow] = useState(() => clock());
  useEffect(() => {
    const id = setInterval(() => setNow(clock()), 1000);
    return () => clearInterval(id);
  }, [clock]);
  const ms = msUntilNextLondonMidnight(now);
  if (ms <= 0) {
    return (
      <button type="button" class="primary" onClick={() => window.location.reload()}>
        New puzzle ready 🐶
      </button>
    );
  }
  return (
    <p class="countdown">
      Next puzzle in <strong>{formatCountdown(ms)}</strong>
    </p>
  );
}

function Leaderboard({ view, me, them, names, syncPending }: Pick<ResultsProps, "view" | "me" | "them" | "names" | "syncPending">) {
  if (!view) {
    return syncPending ? <p class="note">Your time will sync soon 🐾</p> : null;
  }
  const { board, tally } = view;
  if (board.state === "waiting") return <p class="note">Waiting for {them}… 🐾</p>;
  if (board.state !== "complete") return null;
  const headline =
    board.outcome === "draw" ? "💞 a draw!" : board.outcome === "you" ? `🏆 ${me} wins today!` : `🏆 ${them} wins today!`;
  return (
    <section class="leaderboard">
      <h2>{headline}</h2>
      <ol>
        <li>
          <span>{me}</span>
          <span>{formatTime(board.you.seconds)}</span>
        </li>
        <li>
          <span>{them}</span>
          <span>{formatTime(board.other.seconds)}</span>
        </li>
      </ol>
      <p class="tally">{`${names.her} ${tally.her} – ${tally.him} ${names.him}`}</p>
    </section>
  );
}

export function Results(props: ResultsProps) {
  const lives =
    props.livesLost === 0 ? "💖 no lives lost" : `💔 ${props.livesLost} ${props.livesLost === 1 ? "life" : "lives"} lost`;
  return (
    <main class="screen results">
      {props.confetti && <Confetti />}
      <Corgi pose="celebrate" size="large" />
      <h1>{props.message}</h1>
      <p class="difficulty">{props.difficulty}</p>
      <p class="final-time">{formatTime(props.seconds)}</p>
      <p class="lives">{lives}</p>
      {props.streak > 0 && <p class="streak">🔥 {props.streak} day streak</p>}
      {props.paired && <Leaderboard {...props} />}
      <button type="button" onClick={props.onShare}>
        {props.copied ? "Copied! 💗" : "Share your time"}
      </button>
      <Countdown clock={props.clock} />
    </main>
  );
}
