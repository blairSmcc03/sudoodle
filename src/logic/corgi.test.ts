import { describe, expect, test } from "vitest";
import { completedUnits, corgiPose } from "./corgi";
import { enterDigit, newGame, type GameState } from "./game";
import { PUZZLE, SOLUTION } from "./fixtures";

// Row 0 of PUZZLE is "530070000": cells 2, 3, 5, 6, 7, 8 are empty. Fill all but one.
function fillRowZeroExcept(skip: number): GameState {
  let state = newGame(PUZZLE, SOLUTION);
  for (const cell of [2, 3, 5, 6, 7, 8]) {
    if (cell !== skip) state = enterDigit(state, cell, Number(SOLUTION[cell]));
  }
  return state;
}

describe("completedUnits", () => {
  test("filling the last empty cell of a row reports that row", () => {
    const before = fillRowZeroExcept(8);
    const after = enterDigit(before, 8, Number(SOLUTION[8]));
    expect(completedUnits(before.grid, after.grid)).toContainEqual({ kind: "row", index: 0 });
  });

  test("a move that completes nothing reports nothing", () => {
    const before = newGame(PUZZLE, SOLUTION);
    const after = enterDigit(before, 2, 4);
    expect(completedUnits(before.grid, after.grid)).toEqual([]);
  });

  test("a unit that was already complete is not reported again", () => {
    const done = fillRowZeroExcept(-1);
    const after = enterDigit(done, 20, Number(SOLUTION[20]));
    expect(completedUnits(done.grid, after.grid)).not.toContainEqual({ kind: "row", index: 0 });
  });

  test("one move can complete a box and a column together", () => {
    // Almost-solved board with only cell 0 empty: it finishes row 0, column 0 and box 0.
    const almost = "0" + SOLUTION.slice(1);
    const before = newGame(almost, SOLUTION);
    const after = enterDigit(before, 0, Number(SOLUTION[0]));
    const units = completedUnits(before.grid, after.grid);
    expect(units).toContainEqual({ kind: "row", index: 0 });
    expect(units).toContainEqual({ kind: "column", index: 0 });
    expect(units).toContainEqual({ kind: "box", index: 0 });
  });
});

describe("corgiPose", () => {
  const fresh = newGame(PUZZLE, SOLUTION);

  test("rests in the idle pose", () => {
    expect(corgiPose(fresh, [])).toBe("idle");
  });

  test("is sad when a heart was just lost", () => {
    expect(corgiPose(enterDigit(fresh, 2, 1), [])).toBe("sad");
  });

  test("is sad when the hearts just ran out", () => {
    let state = fresh;
    for (let i = 0; i < 3; i++) state = enterDigit(state, 2, 1);
    expect(corgiPose(state, [])).toBe("sad");
  });

  test("is happy right after completing a row, column or box", () => {
    expect(corgiPose(fresh, [{ kind: "row", index: 0 }])).toBe("happy");
  });

  test("celebrates when the puzzle is won, ahead of everything else", () => {
    const almost = SOLUTION.slice(0, 2) + "0" + SOLUTION.slice(3);
    const won = enterDigit(newGame(almost, SOLUTION), 2, 4);
    expect(corgiPose(won, [{ kind: "row", index: 0 }])).toBe("celebrate");
  });
});
