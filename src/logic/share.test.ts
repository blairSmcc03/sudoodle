import { describe, expect, test } from "vitest";
import { shareText } from "./share";

const base = { dateKey: "2026-12-02", difficulty: "medium" as const, seconds: 402, livesLost: 4, url: "https://sudoodle.test" };

describe("shareText", () => {
  test("shows the date, difficulty, time and lives lost, then the link", () => {
    expect(shareText(base)).toBe("Sudoodle · 2 Dec · Medium · ⏱ 6:42 · 💔 4 lives lost\nhttps://sudoodle.test");
  });

  test("uses the singular for one life", () => {
    expect(shareText({ ...base, livesLost: 1 })).toContain("💔 1 life lost");
  });

  test("celebrates a flawless game instead of listing zero lost", () => {
    const text = shareText({ ...base, livesLost: 0 });
    expect(text).toContain("💖 no lives lost");
    expect(text).not.toContain("💔");
  });

  test("never contains the word oops or any puzzle digits beyond the header numbers", () => {
    expect(shareText(base).toLowerCase()).not.toContain("oops");
  });

  test("formats dates across months and single digits", () => {
    expect(shareText({ ...base, dateKey: "2027-01-09" })).toContain("9 Jan");
    expect(shareText({ ...base, dateKey: "2027-12-31" })).toContain("31 Dec");
  });

  test("long times use hours", () => {
    expect(shareText({ ...base, seconds: 3725 })).toContain("⏱ 1:02:05");
  });
});
