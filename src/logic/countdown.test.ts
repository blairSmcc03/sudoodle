import { describe, expect, test } from "vitest";
import { formatCountdown, msUntilNextLondonMidnight } from "./countdown";

const HOUR = 3_600_000;

describe("msUntilNextLondonMidnight", () => {
  test("in winter, 22:00 UTC is two hours before midnight", () => {
    expect(msUntilNextLondonMidnight(new Date("2026-12-05T22:00:00Z"))).toBe(2 * HOUR);
  });

  test("in summer, 22:00 UTC is one hour before midnight (BST is UTC+1)", () => {
    expect(msUntilNextLondonMidnight(new Date("2027-07-05T22:00:00Z"))).toBe(1 * HOUR);
  });

  test("exactly at midnight, a whole new day remains", () => {
    expect(msUntilNextLondonMidnight(new Date("2026-12-05T00:00:00Z"))).toBe(24 * HOUR);
  });

  test("the day clocks go forward (2027-03-28) is 23 hours long", () => {
    expect(msUntilNextLondonMidnight(new Date("2027-03-28T00:00:00Z"))).toBe(23 * HOUR);
  });

  test("the day clocks go back (2027-10-31) is 25 hours long", () => {
    // Midnight BST that day is 2027-10-30T23:00:00Z.
    expect(msUntilNextLondonMidnight(new Date("2027-10-30T23:00:00Z"))).toBe(25 * HOUR);
  });

  test("is accurate to the millisecond", () => {
    expect(msUntilNextLondonMidnight(new Date("2026-12-05T23:59:59.250Z"))).toBe(750);
  });
});

describe("formatCountdown", () => {
  test("pads hours, minutes and seconds", () => {
    expect(formatCountdown(5 * HOUR + 4 * 60_000 + 3_000)).toBe("05:04:03");
  });

  test("rounds partial seconds up so it never shows 00:00:00 early", () => {
    expect(formatCountdown(750)).toBe("00:00:01");
    expect(formatCountdown(0)).toBe("00:00:00");
  });

  test("shows 25 hours on the long day", () => {
    expect(formatCountdown(25 * HOUR)).toBe("25:00:00");
  });
});
