import { describe, expect, test } from "vitest";
import { buildDifficultySchedule, buildDifficultyScheduleBefore, seededRandom } from "./difficulty";

describe("buildDifficultySchedule", () => {
  test("returns one difficulty per day", () => {
    expect(buildDifficultySchedule(365, seededRandom(1))).toHaveLength(365);
  });

  test("never repeats a difficulty more than twice in a row, across many seeds", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const days = buildDifficultySchedule(365, seededRandom(seed));
      for (let i = 2; i < days.length; i++) {
        const threeSame = days[i] === days[i - 1] && days[i] === days[i - 2];
        expect(threeSame, `seed ${seed}, day ${i}`).toBe(false);
      }
    }
  });

  test("is roughly 30% easy, 40% medium, 30% hard over a long run", () => {
    const days = buildDifficultySchedule(30_000, seededRandom(42));
    const share = (d: string) => days.filter((x) => x === d).length / days.length;
    expect(share("easy")).toBeGreaterThan(0.27);
    expect(share("easy")).toBeLessThan(0.33);
    expect(share("medium")).toBeGreaterThan(0.37);
    expect(share("medium")).toBeLessThan(0.43);
    expect(share("hard")).toBeGreaterThan(0.27);
    expect(share("hard")).toBeLessThan(0.33);
  });

  test("the same seed gives the same schedule, a different seed a different one", () => {
    const a = buildDifficultySchedule(50, seededRandom(7));
    expect(buildDifficultySchedule(50, seededRandom(7))).toEqual(a);
    expect(buildDifficultySchedule(50, seededRandom(8))).not.toEqual(a);
  });
});

describe("buildDifficultyScheduleBefore", () => {
  test("returns the requested number of days", () => {
    expect(buildDifficultyScheduleBefore(["easy", "hard"], 11, seededRandom(1))).toHaveLength(11);
  });

  test("never makes three in a row where the new days join the existing ones", () => {
    const existing = ["hard", "hard", "easy", "medium"] as const;
    for (let seed = 1; seed <= 300; seed++) {
      const joined = [...buildDifficultyScheduleBefore(existing, 11, seededRandom(seed)), ...existing];
      for (let i = 2; i < joined.length; i++) {
        const threeSame = joined[i] === joined[i - 1] && joined[i] === joined[i - 2];
        expect(threeSame, `seed ${seed}, day ${i}`).toBe(false);
      }
    }
  });

  test("avoids a third hard when the existing days start with two hards", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const before = buildDifficultyScheduleBefore(["hard", "hard"], 1, seededRandom(seed));
      expect(before).not.toEqual(["hard"]);
    }
  });

  test("zero days is an empty list", () => {
    expect(buildDifficultyScheduleBefore(["easy"], 0, seededRandom(1))).toEqual([]);
  });
});
