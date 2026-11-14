import { isComplete, isCorrect, parseGrid, peersOf, type Grid } from "./grid";

export type GameEvent = { type: "mistake" } | { type: "heartsDepleted" };

interface Snapshot {
  values: number[];
  notes: number[];
}

export interface GameState {
  grid: Grid;
  /** Per-cell pencil marks as a bitmask: bit d set means digit d is noted. */
  notes: number[];
  /** Board snapshots taken before each undoable action, most recent last. */
  history: Snapshot[];
  hearts: number;
  /** Total hearts lost over the whole game, including ones given back. */
  livesLost: number;
  /** Seconds added to the final time by hearts running out. */
  penaltySeconds: number;
  event?: GameEvent;
}

export const STARTING_HEARTS = 3;
export const DEPLETION_PENALTY_SECONDS = 30;

export function newGame(puzzle: string, solution: string): GameState {
  return { grid: parseGrid(puzzle, solution), notes: new Array<number>(81).fill(0), history: [], hearts: STARTING_HEARTS, livesLost: 0, penaltySeconds: 0 };
}

export function enterDigit(state: GameState, index: number, digit: number): GameState {
  if (state.grid.givens[index] || state.grid.values[index] !== 0) return state;
  if (!isCorrect(state.grid, index, digit)) {
    const livesLost = state.livesLost + 1;
    if (state.hearts - 1 <= 0) {
      return {
        ...state,
        hearts: 1,
        livesLost,
        penaltySeconds: state.penaltySeconds + DEPLETION_PENALTY_SECONDS,
        event: { type: "heartsDepleted" },
      };
    }
    return { ...state, hearts: state.hearts - 1, livesLost, event: { type: "mistake" } };
  }
  const values = [...state.grid.values];
  values[index] = digit;
  const notes = [...state.notes];
  notes[index] = 0;
  for (const peer of peersOf(index)) notes[peer] = (notes[peer] ?? 0) & ~(1 << digit);
  return { ...state, grid: { ...state.grid, values }, notes, history: pushHistory(state), event: undefined };
}

function pushHistory(state: GameState): Snapshot[] {
  return [...state.history, { values: state.grid.values, notes: state.notes }];
}

/** Takes back the last board change. Hearts, lives lost and penalties are never restored. */
export function undo(state: GameState): GameState {
  const previous = state.history[state.history.length - 1];
  if (!previous) return state;
  return {
    ...state,
    grid: { ...state.grid, values: previous.values },
    notes: previous.notes,
    history: state.history.slice(0, -1),
    event: undefined,
  };
}

/** The digits noted in a cell, ascending. */
export function notesAt(state: GameState, index: number): number[] {
  const mask = state.notes[index] ?? 0;
  const digits: number[] = [];
  for (let d = 1; d <= 9; d++) if (mask & (1 << d)) digits.push(d);
  return digits;
}

export function toggleNote(state: GameState, index: number, digit: number): GameState {
  if (state.grid.values[index] !== 0) return state;
  const notes = [...state.notes];
  notes[index] = (notes[index] ?? 0) ^ (1 << digit);
  return { ...state, notes, history: pushHistory(state), event: undefined };
}

/** Clears the notes and any player-placed digit in a cell. Givens are never cleared. */
export function eraseCell(state: GameState, index: number): GameState {
  if (state.grid.givens[index]) return state;
  const values = [...state.grid.values];
  values[index] = 0;
  const notes = [...state.notes];
  notes[index] = 0;
  return { ...state, grid: { ...state.grid, values }, notes, history: pushHistory(state), event: undefined };
}

export function isWon(state: GameState): boolean {
  return isComplete(state.grid);
}
