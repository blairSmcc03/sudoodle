import { describe, expect, test } from "vitest";
import { parseGrid, peersOf } from "./grid";
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

describe("peersOf", () => {
  test("a corner cell's peers are its row, column and box, excluding itself", () => {
    // cell 0 (row 0, col 0): row 1-8, column 9,18,...,72, box adds 10,11,19,20
    expect([...peersOf(0)].sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20, 27, 36, 45, 54, 63, 72,
    ]);
  });

  test("a centre cell's peers come from the middle box, not neighbouring ones", () => {
    // cell 40 (row 4, col 4): row 36-44, column 4,13,...,76, box rows 3-5 cols 3-5
    expect([...peersOf(40)].sort((a, b) => a - b)).toEqual([
      4, 13, 22, 30, 31, 32, 36, 37, 38, 39, 41, 42, 43, 44, 48, 49, 50, 58, 67, 76,
    ]);
  });
});
