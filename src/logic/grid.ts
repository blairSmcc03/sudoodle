export interface Grid {
  /** 81 cell values, 0 = empty. */
  values: number[];
  /** True for cells that were part of the original puzzle. */
  givens: boolean[];
  /** 81 solution digits, 1-9. */
  solution: number[];
}

export function parseGrid(puzzle: string, solution: string): Grid {
  const values = [...puzzle].map(Number);
  return {
    values,
    givens: values.map((v) => v !== 0),
    solution: [...solution].map(Number),
  };
}
