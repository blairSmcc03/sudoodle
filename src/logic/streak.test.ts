import { describe, expect, test } from "vitest";
import { currentStreak, recordFinish, type Streak } from "./streak";

const none: Streak = { count: 0, lastDate: null };

describe("recordFinish", () => {
  test("the first ever finish starts a streak of 1", () => {
    expect(recordFinish(none, "2026-12-01")).toEqual({ count: 1, lastDate: "2026-12-01" });
  });

  test("finishing the next day extends the streak", () => {
    const streak = recordFinish({ count: 3, lastDate: "2026-12-04" }, "2026-12-05");
    expect(streak).toEqual({ count: 4, lastDate: "2026-12-05" });
  });

  test("finishing again on the same day changes nothing", () => {
    const streak: Streak = { count: 3, lastDate: "2026-12-05" };
    expect(recordFinish(streak, "2026-12-05")).toEqual(streak);
  });

  test("a missed day restarts the streak at 1", () => {
    expect(recordFinish({ count: 9, lastDate: "2026-12-04" }, "2026-12-06")).toEqual({
      count: 1,
      lastDate: "2026-12-06",
    });
  });

  test("extends across a month and a year boundary", () => {
    expect(recordFinish({ count: 1, lastDate: "2026-12-31" }, "2027-01-01").count).toBe(2);
  });
});

describe("currentStreak", () => {
  test("is the saved count if she finished today", () => {
    expect(currentStreak({ count: 5, lastDate: "2026-12-05" }, "2026-12-05")).toBe(5);
  });

  test("is still alive the day after, until today's puzzle is missed", () => {
    expect(currentStreak({ count: 5, lastDate: "2026-12-04" }, "2026-12-05")).toBe(5);
  });

  test("is 0 once a whole day has been missed", () => {
    expect(currentStreak({ count: 5, lastDate: "2026-12-03" }, "2026-12-05")).toBe(0);
  });

  test("is 0 when nothing has ever been finished", () => {
    expect(currentStreak(none, "2026-12-05")).toBe(0);
  });
});
