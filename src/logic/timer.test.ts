import { describe, expect, test } from "vitest";
import { elapsedMs, finalSeconds, formatTime, restoreTimer, setVisible, startTimer, stopTimer } from "./timer";

describe("active timer", () => {
  test("counts time while the page is visible", () => {
    const timer = startTimer(1_000, true);
    expect(elapsedMs(timer, 6_000)).toBe(5_000);
  });

  test("does not count time while the page is hidden", () => {
    let timer = startTimer(0, true);
    timer = setVisible(timer, false, 10_000);
    expect(elapsedMs(timer, 70_000)).toBe(10_000);
  });

  test("resumes counting when the page becomes visible again", () => {
    let timer = startTimer(0, true);
    timer = setVisible(timer, false, 10_000);
    timer = setVisible(timer, true, 70_000);
    expect(elapsedMs(timer, 75_000)).toBe(15_000);
  });

  test("starting while the page is hidden counts nothing until it is shown", () => {
    let timer = startTimer(0, false);
    expect(elapsedMs(timer, 5_000)).toBe(0);
    timer = setVisible(timer, true, 5_000);
    expect(elapsedMs(timer, 8_000)).toBe(3_000);
  });

  test("repeated visibility signals do not double count", () => {
    let timer = startTimer(0, true);
    timer = setVisible(timer, true, 4_000);
    timer = setVisible(timer, false, 6_000);
    timer = setVisible(timer, false, 9_000);
    expect(elapsedMs(timer, 20_000)).toBe(6_000);
  });

  test("stopping freezes the time for good", () => {
    const stopped = stopTimer(startTimer(0, true), 7_000);
    expect(elapsedMs(stopped, 99_000)).toBe(7_000);
    expect(elapsedMs(setVisible(stopped, true, 100_000), 200_000)).toBe(7_000);
  });
});

describe("restoring after a reload", () => {
  test("carries over the elapsed time and resumes from the new session", () => {
    const before = setVisible(startTimer(0, true), false, 20_000);
    const restored = restoreTimer(elapsedMs(before, 30_000), 1_000_000, true);
    expect(elapsedMs(restored, 1_005_000)).toBe(25_000);
  });
});

describe("final time", () => {
  test("is active time plus the penalty, in whole seconds", () => {
    expect(finalSeconds(61_400, 30)).toBe(91);
  });

  test("rounds partial seconds to the nearest second", () => {
    expect(finalSeconds(61_600, 0)).toBe(62);
  });
});

describe("formatTime", () => {
  test("formats as m:ss", () => {
    expect(formatTime(402)).toBe("6:42");
    expect(formatTime(59)).toBe("0:59");
  });

  test("formats long times with hours", () => {
    expect(formatTime(3_725)).toBe("1:02:05");
  });
});
