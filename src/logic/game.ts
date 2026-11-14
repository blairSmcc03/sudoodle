import { parseGrid, isCorrect, type Grid } from "./grid";

export type GameEvent = { type: "mistake" };

export interface GameState {
  grid: Grid;
  hearts: number;
  event?: GameEvent;
}

export const STARTING_HEARTS = 3;

export function newGame(puzzle: string, solution: string): GameState {
  return { grid: parseGrid(puzzle, solution), hearts: STARTING_HEARTS };
}

export function enterDigit(state: GameState, index: number, digit: number): GameState {
  if (state.grid.givens[index] || state.grid.values[index] !== 0) return state;
  if (!isCorrect(state.grid, index, digit)) {
    return { ...state, hearts: state.hearts - 1, event: { type: "mistake" } };
  }
  const values = [...state.grid.values];
  values[index] = digit;
  return { ...state, grid: { ...state.grid, values }, event: undefined };
}
