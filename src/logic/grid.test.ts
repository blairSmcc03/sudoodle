import { describe, expect, test } from "vitest";
import {
  cellsWithDigit,
  digitCounts,
  findConflicts,
  isComplete,
  isCorrect,
  parseGrid,
  peersOf,
  type Grid,
} from "./grid";
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

function withValue(grid: Grid, index: number, digit: number): Grid {
  const values = [...grid.values];
  values[index] = digit;
  return { ...grid, values };
}

describe("findConflicts", () => {
  test("a fresh puzzle has no conflicts", () => {
    expect(findConflicts(parseGrid(PUZZLE, SOLUTION))).toEqual([]);
  });

  test("a digit repeated in a row flags both cells", () => {
    // cell 2 is empty; row 0 already has a 5 at cell 0
    const grid = withValue(parseGrid(PUZZLE, SOLUTION), 2, 5);
    expect(findConflicts(grid)).toEqual([0, 2]);
  });

  test("a digit repeated in a column flags both cells", () => {
    // cell 18 (row 2, col 0) is empty; column 0 has a 5 at cell 0
    const grid = withValue(parseGrid(PUZZLE, SOLUTION), 18, 5);
    expect(findConflicts(grid)).toEqual([0, 18]);
  });

  test("a digit repeated in a box flags both cells", () => {
    // cell 2 is empty; the only 9 among its peers is the given at cell 19 (same box,
    // different row and column); row 0 and column 2 contain no 9.
    const grid = withValue(parseGrid(PUZZLE, SOLUTION), 2, 9);
    expect(findConflicts(grid)).toEqual([2, 19]);
  });

  test("a wrong digit that conflicts with nothing is not a conflict", () => {
    // cell 2 should be 4; 1 appears nowhere in row 0, column 2 or box 0
    const grid = withValue(parseGrid(PUZZLE, SOLUTION), 2, 1);
    expect(findConflicts(grid)).toEqual([]);
  });
});

describe("isCorrect", () => {
  const grid = parseGrid(PUZZLE, SOLUTION);

  test("accepts the solution digit for a cell", () => {
    expect(isCorrect(grid, 2, 4)).toBe(true);
  });

  test("rejects a digit that contradicts the solution", () => {
    expect(isCorrect(grid, 2, 1)).toBe(false);
  });

  test("rejects a digit that also conflicts with a peer", () => {
    expect(isCorrect(grid, 2, 5)).toBe(false);
  });
});

describe("isComplete", () => {
  test("is false while cells are empty", () => {
    expect(isComplete(parseGrid(PUZZLE, SOLUTION))).toBe(false);
  });

  test("is true when every cell holds the solution digit", () => {
    expect(isComplete(parseGrid(SOLUTION, SOLUTION))).toBe(true);
  });

  test("is false when one cell holds a wrong digit", () => {
    expect(isComplete(withValue(parseGrid(SOLUTION, SOLUTION), 0, 1))).toBe(false);
  });
});

describe("digitCounts", () => {
  test("counts how many of each digit are placed", () => {
    const counts = digitCounts(parseGrid(PUZZLE, SOLUTION));
    expect(counts[1]).toBe(3);
    expect(counts[2]).toBe(2);
    expect(counts[6]).toBe(5);
    expect(counts[9]).toBe(4);
  });

  test("a fully solved grid has nine of every digit", () => {
    const counts = digitCounts(parseGrid(SOLUTION, SOLUTION));
    for (let d = 1; d <= 9; d++) expect(counts[d]).toBe(9);
  });
});

describe("cellsWithDigit", () => {
  test("lists every cell holding the digit", () => {
    expect(cellsWithDigit(parseGrid(PUZZLE, SOLUTION), 5)).toEqual([0, 14, 71]);
  });

  test("includes cells filled in by the player", () => {
    const grid = withValue(parseGrid(PUZZLE, SOLUTION), 2, 4);
    expect(cellsWithDigit(grid, 4)).toEqual([2, 36, 66]);
  });
});
