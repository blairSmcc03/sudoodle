import { describe, expect, test } from "vitest";
import { enterDigit, eraseCell, newGame, notesAt, toggleNote, type GameState } from "./game";
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

describe("notes", () => {
  test("toggling a note adds it, toggling again removes it", () => {
    const on = toggleNote(newGame(PUZZLE, SOLUTION), 2, 4);
    expect(notesAt(on, 2)).toEqual([4]);
    expect(notesAt(toggleNote(on, 2, 4), 2)).toEqual([]);
  });

  test("notes are kept sorted", () => {
    let state = newGame(PUZZLE, SOLUTION);
    for (const d of [7, 1, 4]) state = toggleNote(state, 2, d);
    expect(notesAt(state, 2)).toEqual([1, 4, 7]);
  });

  test("notes cannot be added to a given or to a filled cell", () => {
    const filled = enterDigit(newGame(PUZZLE, SOLUTION), 2, 4);
    expect(notesAt(toggleNote(filled, 2, 1), 2)).toEqual([]);
    expect(notesAt(toggleNote(filled, 0, 1), 0)).toEqual([]);
  });

  test("placing a digit clears that cell's notes", () => {
    let state = toggleNote(toggleNote(newGame(PUZZLE, SOLUTION), 2, 1), 2, 4);
    state = enterDigit(state, 2, 4);
    expect(notesAt(state, 2)).toEqual([]);
  });

  test("placing a digit removes it from the notes of its row, column and box", () => {
    // 4 goes at cell 2. Peers: 3 (row), 20 (box), 38 (column 2, row 4).
    let state = newGame(PUZZLE, SOLUTION);
    for (const cell of [3, 20, 38]) state = toggleNote(toggleNote(state, cell, 4), cell, 9);
    state = enterDigit(state, 2, 4);
    expect(notesAt(state, 3)).toEqual([9]);
    expect(notesAt(state, 20)).toEqual([9]);
    expect(notesAt(state, 38)).toEqual([9]);
  });

  test("notes elsewhere on the board are untouched", () => {
    // cell 41 (row 4, col 5) shares no row, column or box with cell 2
    let state = toggleNote(newGame(PUZZLE, SOLUTION), 41, 4);
    state = enterDigit(state, 2, 4);
    expect(notesAt(state, 41)).toEqual([4]);
  });

  test("a mistake leaves notes alone", () => {
    let state = toggleNote(newGame(PUZZLE, SOLUTION), 3, 1);
    state = enterDigit(state, 2, 1);
    expect(notesAt(state, 3)).toEqual([1]);
  });
});

describe("eraseCell", () => {
  test("clears the notes in a cell", () => {
    const state = eraseCell(toggleNote(newGame(PUZZLE, SOLUTION), 2, 4), 2);
    expect(notesAt(state, 2)).toEqual([]);
  });

  test("clears a digit the player placed", () => {
    const state = eraseCell(enterDigit(newGame(PUZZLE, SOLUTION), 2, 4), 2);
    expect(state.grid.values[2]).toBe(0);
  });

  test("never clears a given", () => {
    expect(eraseCell(newGame(PUZZLE, SOLUTION), 0).grid.values[0]).toBe(5);
  });
});
