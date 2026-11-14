import { describe, expect, test } from "vitest";
import { londonDateKey } from "./schedule";

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
