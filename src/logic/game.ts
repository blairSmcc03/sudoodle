import { parseGrid, isCorrect, type Grid } from "./grid";

export type GameEvent = { type: "mistake" } | { type: "heartsDepleted" };

export interface GameState {
  grid: Grid;
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
  return { grid: parseGrid(puzzle, solution), hearts: STARTING_HEARTS, livesLost: 0, penaltySeconds: 0 };
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
  return { ...state, grid: { ...state.grid, values }, event: undefined };
}
