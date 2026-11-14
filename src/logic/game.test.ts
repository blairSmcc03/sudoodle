import { describe, expect, test } from "vitest";
import { enterDigit, newGame } from "./game";
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
