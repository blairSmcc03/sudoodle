export interface Grid {
  /** 81 cell values, 0 = empty. */
  values: number[];
  /** True for cells that were part of the original puzzle. */
  givens: boolean[];
  /** 81 solution digits, 1-9. */
  solution: number[];
}

function toDigits(text: string, what: string): number[] {
  if (text.length !== 81) {
    throw new Error(`${what} must be 81 characters, got ${text.length}`);
  }
  if (!/^[0-9]+$/.test(text)) {
    throw new Error(`${what} must contain only digits`);
  }
  return [...text].map(Number);
}

export function parseGrid(puzzle: string, solution: string): Grid {
  const values = toDigits(puzzle, "puzzle");
  const solved = toDigits(solution, "solution");
  if (solved.includes(0)) {
    throw new Error("solution must not contain empty cells");
  }
  values.forEach((v, i) => {
    if (v !== 0 && v !== solved[i]) {
      throw new Error(`solution contradicts given at cell ${i}`);
    }
  });
  return { values, givens: values.map((v) => v !== 0), solution: solved };
}

/** The 20 cells sharing a row, column or box with `index` (excluding itself). */
export function peersOf(index: number): number[] {
  const row = Math.floor(index / 9);
  const col = index % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  const peers = new Set<number>();
  for (let i = 0; i < 9; i++) {
    peers.add(row * 9 + i);
    peers.add(i * 9 + col);
    peers.add((boxRow + Math.floor(i / 3)) * 9 + boxCol + (i % 3));
  }
  peers.delete(index);
  return [...peers];
}

/** Indices (ascending) of filled cells whose digit also appears in one of their peers. */
export function findConflicts(grid: Grid): number[] {
  const conflicts: number[] = [];
  grid.values.forEach((digit, index) => {
    if (digit !== 0 && peersOf(index).some((p) => grid.values[p] === digit)) {
      conflicts.push(index);
    }
  });
  return conflicts;
}

/** True if `digit` is the solution digit for cell `index`. */
export function isCorrect(grid: Grid, index: number, digit: number): boolean {
  return grid.solution[index] === digit;
}

/** True when every cell holds its solution digit. */
export function isComplete(grid: Grid): boolean {
  return grid.values.every((v, i) => v === grid.solution[i]);
}

/** Index 1-9: how many of each digit are currently on the board. Index 0 is unused. */
export function digitCounts(grid: Grid): number[] {
  const counts = new Array<number>(10).fill(0);
  for (const v of grid.values) counts[v] = (counts[v] ?? 0) + 1;
  counts[0] = 0;
  return counts;
}

/** Indices (ascending) of every cell holding `digit`. */
export function cellsWithDigit(grid: Grid, digit: number): number[] {
  const cells: number[] = [];
  grid.values.forEach((v, i) => {
    if (v === digit) cells.push(i);
  });
  return cells;
}
