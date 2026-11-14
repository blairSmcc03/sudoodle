import { digitCounts } from "../logic/grid";
import type { GameState } from "../logic/game";

interface Props {
  state: GameState;
  onDigit(digit: number): void;
}

export function NumberPad({ state, onDigit }: Props) {
  const counts = digitCounts(state.grid);
  return (
    <div class="pad">
      {Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => {
        const done = (counts[digit] ?? 0) >= 9;
        return (
          <button
            key={digit}
            type="button"
            class="pad-key"
            aria-label={`Digit ${digit}${done ? ", all placed" : ""}`}
            disabled={done}
            onClick={() => onDigit(digit)}
          >
            {digit}
          </button>
        );
      })}
    </div>
  );
}
