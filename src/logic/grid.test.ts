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
});
