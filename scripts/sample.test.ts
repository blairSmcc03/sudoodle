import { describe, expect, test } from "vitest";
import { buildSampleBatch } from "./sample";
import { parseGrid } from "../src/logic/grid";

describe("buildSampleBatch (dev-only, no API key needed)", () => {
  test("produces valid, consistent puzzles for each day", () => {
    const batch = buildSampleBatch("2026-12-01", 10);
    expect(batch.puzzles).toHaveLength(10);
    for (const p of batch.puzzles) expect(() => parseGrid(p.puzzle, p.solution)).not.toThrow();
  });

  test("different days get different puzzles", () => {
    const batch = buildSampleBatch("2026-12-01", 5);
    expect(new Set(batch.puzzles.map((p) => p.puzzle)).size).toBe(5);
  });
});
