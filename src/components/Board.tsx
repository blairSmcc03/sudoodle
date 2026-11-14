import { cellsWithDigit, peersOf } from "../logic/grid";
import { notesAt, type GameState } from "../logic/game";

interface Props {
  state: GameState;
  selected: number | null;
  shake: boolean;
  onSelect(index: number): void;
}

function label(state: GameState, index: number): string {
  const value = state.grid.values[index] ?? 0;
  const row = Math.floor(index / 9) + 1;
  const col = (index % 9) + 1;
  let text = `Row ${row}, column ${col}, ${value === 0 ? "empty" : value}`;
  if (state.grid.givens[index]) text += ", given";
  const notes = notesAt(state, index);
  if (value === 0 && notes.length > 0) text += `, notes ${notes.join(" ")}`;
  return text;
}

export function Board({ state, selected, shake, onSelect }: Props) {
  const peers = new Set(selected === null ? [] : peersOf(selected));
  const selectedDigit = selected === null ? 0 : (state.grid.values[selected] ?? 0);
  const matches = new Set(selectedDigit === 0 ? [] : cellsWithDigit(state.grid, selectedDigit));

  return (
    <div class={`board${shake ? " shake" : ""}`} role="group" aria-label="Sudoku board">
      {state.grid.values.map((value, index) => {
        const classes = ["cell"];
        if (state.grid.givens[index]) classes.push("given");
        if (index === selected) classes.push("selected");
        else if (matches.has(index)) classes.push("match");
        else if (peers.has(index)) classes.push("peer");
        if (index % 9 === 2 || index % 9 === 5) classes.push("box-right");
        if (Math.floor(index / 9) === 2 || Math.floor(index / 9) === 5) classes.push("box-bottom");
        const notes = value === 0 ? notesAt(state, index) : [];
        return (
          <button
            key={index}
            type="button"
            class={classes.join(" ")}
            aria-label={label(state, index)}
            onClick={() => onSelect(index)}
          >
            {value !== 0 ? (
              <span class="digit">{value}</span>
            ) : (
              notes.length > 0 && (
                <span class="notes" aria-hidden="true">
                  {Array.from({ length: 9 }, (_, i) => (
                    <span key={i}>{notes.includes(i + 1) ? i + 1 : ""}</span>
                  ))}
                </span>
              )
            )}
          </button>
        );
      })}
    </div>
  );
}
