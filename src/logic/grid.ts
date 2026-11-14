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
