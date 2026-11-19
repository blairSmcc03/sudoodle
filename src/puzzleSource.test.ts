// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { puzzleSourceFor } from "./puzzleSource";

describe("puzzleSourceFor", () => {
  test("the real batch is used by default", () => {
    expect(puzzleSourceFor({ dev: true, search: "" })).toBe("puzzles.json");
  });

  test("?puzzles=dev selects the sample in a dev build", () => {
    expect(puzzleSourceFor({ dev: true, search: "?puzzles=dev" })).toBe("puzzles.dev.json");
  });

  test("?puzzles=dev is ignored in a production build", () => {
    expect(puzzleSourceFor({ dev: false, search: "?puzzles=dev" })).toBe("puzzles.json");
  });

  test("other values do not select the sample", () => {
    expect(puzzleSourceFor({ dev: true, search: "?puzzles=real" })).toBe("puzzles.json");
  });
});
