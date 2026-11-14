import { describe, expect, test } from "vitest";
import { boardFor, tally, type DayResult } from "./leaderboard";

const r = (player: "her" | "him", seconds: number, livesLost = 0): DayResult => ({ player, seconds, livesLost });

describe("boardFor (spoiler-free view of one day)", () => {
  test("before you finish you see nothing, even if the other has", () => {
    expect(boardFor(undefined, r("him", 300))).toEqual({ state: "locked", otherFinished: true });
    expect(boardFor(undefined, undefined)).toEqual({ state: "locked", otherFinished: false });
  });

  test("after you finish but before the other does, you wait", () => {
    expect(boardFor(r("her", 400), undefined)).toEqual({ state: "waiting", you: r("her", 400) });
  });

  test("when both have finished, the faster time wins", () => {
    expect(boardFor(r("her", 400), r("him", 500))).toEqual({
      state: "complete",
      you: r("her", 400),
      other: r("him", 500),
      outcome: "you",
    });
  });

  test("the slower time loses", () => {
    expect(boardFor(r("her", 600), r("him", 500)).state).toBe("complete");
    expect(boardFor(r("her", 600), r("him", 500))).toMatchObject({ outcome: "other" });
  });

  test("the same time is a draw", () => {
    expect(boardFor(r("her", 500), r("him", 500))).toMatchObject({ outcome: "draw" });
  });

  test("the outcome is from the viewer's side", () => {
    expect(boardFor(r("him", 400), r("her", 500))).toMatchObject({ outcome: "you" });
  });

  test("lives lost are shown but do not change the ranking", () => {
    const board = boardFor(r("her", 400, 5), r("him", 500, 0));
    expect(board).toMatchObject({ outcome: "you" });
  });
});

describe("tally", () => {
  test("counts a win for the faster player on each day where both finished", () => {
    const days: Record<string, DayResult[]> = {
      "2026-12-01": [r("her", 300), r("him", 400)],
      "2026-12-02": [r("her", 500), r("him", 450)],
      "2026-12-03": [r("her", 200), r("him", 400)],
    };
    expect(tally(days)).toEqual({ her: 2, him: 1, draws: 0 });
  });

  test("a draw counts for nobody, and is counted separately", () => {
    expect(tally({ "2026-12-01": [r("her", 300), r("him", 300)] })).toEqual({ her: 0, him: 0, draws: 1 });
  });

  test("days where only one player finished do not count", () => {
    expect(tally({ "2026-12-01": [r("her", 300)], "2026-12-02": [r("him", 300)] })).toEqual({ her: 0, him: 0, draws: 0 });
  });

  test("an empty history is 0-0", () => {
    expect(tally({})).toEqual({ her: 0, him: 0, draws: 0 });
  });
});
