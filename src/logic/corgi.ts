import type { GameState } from "./game";
import { isWon } from "./game";
import type { Grid } from "./grid";

export type CorgiPose = "idle" | "happy" | "sad" | "celebrate";
export type Unit = { kind: "row" | "column" | "box"; index: number };

function unitCells(unit: Unit): number[] {
  const cells: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (unit.kind === "row") cells.push(unit.index * 9 + i);
    else if (unit.kind === "column") cells.push(i * 9 + unit.index);
    else {
      const r = Math.floor(unit.index / 3) * 3 + Math.floor(i / 3);
      const c = (unit.index % 3) * 3 + (i % 3);
      cells.push(r * 9 + c);
    }
  }
  return cells;
}

function isFull(grid: Grid, unit: Unit): boolean {
  return unitCells(unit).every((cell) => grid.values[cell] !== 0);
}

/** Rows, columns and boxes that are full in `after` but were not in `before`. */
export function completedUnits(before: Grid, after: Grid): Unit[] {
  const done: Unit[] = [];
  for (const kind of ["row", "column", "box"] as const) {
    for (let index = 0; index < 9; index++) {
      const unit = { kind, index };
      if (isFull(after, unit) && !isFull(before, unit)) done.push(unit);
    }
  }
  return done;
}

/** Which corgi picture to show after the latest move. */
export function corgiPose(state: GameState, justCompleted: Unit[]): CorgiPose {
  if (isWon(state)) return "celebrate";
  if (state.event?.type === "mistake" || state.event?.type === "heartsDepleted") return "sad";
  if (justCompleted.length > 0) return "happy";
  return "idle";
}
