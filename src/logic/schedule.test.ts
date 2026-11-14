import { describe, expect, test } from "vitest";
import { londonDateKey, puzzleForDate, type PuzzleBatch } from "./schedule";

describe("londonDateKey", () => {
  test("in winter (GMT) the date flips at 00:00 UTC", () => {
    expect(londonDateKey(new Date("2026-12-01T23:59:59Z"))).toBe("2026-12-01");
    expect(londonDateKey(new Date("2026-12-02T00:00:00Z"))).toBe("2026-12-02");
  });

  test("in summer (BST) the date flips at 23:00 UTC", () => {
    expect(londonDateKey(new Date("2027-07-01T22:59:59Z"))).toBe("2027-07-01");
    expect(londonDateKey(new Date("2027-07-01T23:00:00Z"))).toBe("2027-07-02");
  });
});

const batch: PuzzleBatch = {
  startDate: "2026-12-01",
  puzzles: [
    { difficulty: "easy", puzzle: "p0", solution: "s0" },
    { difficulty: "hard", puzzle: "p1", solution: "s1" },
    { difficulty: "medium", puzzle: "p2", solution: "s2" },
  ],
};

describe("puzzleForDate", () => {
  test("the start date maps to the first puzzle", () => {
    expect(puzzleForDate(batch, "2026-12-01")).toEqual({
      status: "ready",
      puzzle: { difficulty: "easy", puzzle: "p0", solution: "s0" },
    });
  });

  test("later dates map to later puzzles, across a month boundary", () => {
    expect(puzzleForDate(batch, "2026-12-03")).toMatchObject({ status: "ready", puzzle: { puzzle: "p2" } });
  });

  test("a date before the start is reported as not started, with the start date", () => {
    expect(puzzleForDate(batch, "2026-11-30")).toEqual({ status: "not-started", startDate: "2026-12-01" });
  });

  test("a date after the last puzzle is reported as exhausted", () => {
    expect(puzzleForDate(batch, "2026-12-04")).toEqual({ status: "exhausted" });
  });

  test("day counting is not thrown off by the March clock change", () => {
    const spring: PuzzleBatch = {
      startDate: "2027-03-27",
      puzzles: ["a", "b", "c"].map((p) => ({ difficulty: "easy" as const, puzzle: p, solution: p })),
    };
    // Clocks go forward on 2027-03-28; the 29th must still be the third puzzle.
    expect(puzzleForDate(spring, "2027-03-29")).toMatchObject({ status: "ready", puzzle: { puzzle: "c" } });
  });
});
