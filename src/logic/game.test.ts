import { describe, expect, test } from "vitest";
import { enterDigit, newGame, type GameState } from "./game";
import { PUZZLE, SOLUTION } from "./fixtures";

// In PUZZLE, cell 2 is empty and its solution digit is 4; 1 is wrong for it.
describe("enterDigit", () => {
  test("a correct digit is placed on the board", () => {
    const state = enterDigit(newGame(PUZZLE, SOLUTION), 2, 4);
    expect(state.grid.values[2]).toBe(4);
    expect(state.hearts).toBe(3);
  });

  test("a wrong digit is not placed and costs a heart", () => {
    const state = enterDigit(newGame(PUZZLE, SOLUTION), 2, 1);
    expect(state.grid.values[2]).toBe(0);
    expect(state.hearts).toBe(2);
    expect(state.event?.type).toBe("mistake");
  });

  test("a given cell cannot be changed", () => {
    const state = enterDigit(newGame(PUZZLE, SOLUTION), 0, 9);
    expect(state.grid.values[0]).toBe(5);
    expect(state.hearts).toBe(3);
  });

  test("entering into a cell that already holds a digit does nothing", () => {
    const placed = enterDigit(newGame(PUZZLE, SOLUTION), 2, 4);
    const again = enterDigit(placed, 2, 7);
    expect(again.grid.values[2]).toBe(4);
    expect(again.hearts).toBe(3);
  });
});

function makeMistakes(state: GameState, count: number): GameState {
  let next = state;
  for (let i = 0; i < count; i++) next = enterDigit(next, 2, 1);
  return next;
}

describe("hearts depleted", () => {
  test("losing the last heart gives one heart back and adds a 30s penalty", () => {
    const state = makeMistakes(newGame(PUZZLE, SOLUTION), 3);
    expect(state.hearts).toBe(1);
    expect(state.penaltySeconds).toBe(30);
    expect(state.event?.type).toBe("heartsDepleted");
  });

  test("the board is kept as it was", () => {
    const progressed = enterDigit(newGame(PUZZLE, SOLUTION), 2, 4);
    const state = makeMistakes(progressed, 3);
    expect(state.grid.values[2]).toBe(4);
  });

  test("losing the single remaining heart is another depletion", () => {
    const state = makeMistakes(newGame(PUZZLE, SOLUTION), 4);
    expect(state.hearts).toBe(1);
    expect(state.penaltySeconds).toBe(60);
  });

  test("counts every heart lost, including the ones given back", () => {
    expect(makeMistakes(newGame(PUZZLE, SOLUTION), 1).livesLost).toBe(1);
    expect(makeMistakes(newGame(PUZZLE, SOLUTION), 4).livesLost).toBe(4);
  });

  test("a fresh game has no penalty and no lives lost", () => {
    const state = newGame(PUZZLE, SOLUTION);
    expect(state.penaltySeconds).toBe(0);
    expect(state.livesLost).toBe(0);
  });
});
