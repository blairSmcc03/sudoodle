import { describe, expect, test } from "vitest";
import { parseGrid } from "./grid";
import { PUZZLE, SOLUTION } from "./fixtures";

describe("parseGrid", () => {
  test("reads givens and empty cells from the puzzle string", () => {
    const grid = parseGrid(PUZZLE, SOLUTION);
    expect(grid.values[0]).toBe(5);
    expect(grid.values[2]).toBe(0);
    expect(grid.givens[0]).toBe(true);
    expect(grid.givens[2]).toBe(false);
    expect(grid.values).toHaveLength(81);
  });

  test("rejects a puzzle that is not 81 characters", () => {
    expect(() => parseGrid(PUZZLE.slice(1), SOLUTION)).toThrow(/81/);
  });

  test("rejects a puzzle containing a non-digit character", () => {
    expect(() => parseGrid("x" + PUZZLE.slice(1), SOLUTION)).toThrow(/digit/i);
  });

  test("rejects a solution with an empty cell", () => {
    expect(() => parseGrid(PUZZLE, "0" + SOLUTION.slice(1))).toThrow(/solution/i);
  });

  test("rejects a solution that contradicts a given", () => {
    // PUZZLE starts with a given 5; this solution starts with 4 instead.
    expect(() => parseGrid(PUZZLE, "4" + SOLUTION.slice(1))).toThrow(/given/i);
  });
});
