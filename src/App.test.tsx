// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/preact";
import { App, type AppProps } from "./App";
import { PUZZLE, SOLUTION } from "./logic/fixtures";
import type { KeyValueStore } from "./logic/persistence";

const config = {
  names: { her: "Sam", him: "Blair" },
  completionMessages: ["You did it! 🐾"],
  siteUrl: "https://sudoodle.test",
};

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const batch = {
  startDate: "2026-12-01",
  puzzles: [
    { difficulty: "medium" as const, puzzle: PUZZLE, solution: SOLUTION },
    { difficulty: "easy" as const, puzzle: PUZZLE, solution: SOLUTION },
  ],
};

function setup(overrides: Partial<AppProps> = {}) {
  const props: AppProps = {
    batch,
    config,
    clock: () => new Date("2026-12-01T10:00:00Z"),
    store: memoryStore(),
    ...overrides,
  };
  return { props, ...render(<App {...props} />) };
}

const cell = (row: number, col: number) => screen.getByRole("button", { name: new RegExp(`^Row ${row}, column ${col},`) });
const pad = (digit: number) => screen.getByRole("button", { name: new RegExp(`^Digit ${digit}`) });
const start = () => fireEvent.click(screen.getByRole("button", { name: /start/i }));

describe("before the batch starts", () => {
  test("shows a friendly coming-soon message instead of a puzzle", () => {
    setup({ clock: () => new Date("2026-11-20T10:00:00Z") });
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    expect(screen.getByText(/1 Dec/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /start/i })).toBeNull();
  });
});

describe("after the batch has run out", () => {
  test("shows a friendly message instead of an error", () => {
    setup({ clock: () => new Date("2026-12-10T10:00:00Z") });
    expect(screen.getByText(/new puzzles are on their way/i)).toBeInTheDocument();
  });
});

describe("the Ready screen", () => {
  test("greets her by the configured name and shows today's difficulty", () => {
    setup();
    expect(screen.getByText(/Sam/)).toBeInTheDocument();
    expect(screen.getByText(/medium/i)).toBeInTheDocument();
  });

  test("keeps the puzzle hidden until Start is tapped", () => {
    setup();
    expect(screen.queryByRole("button", { name: /^Row 1, column 1,/ })).toBeNull();
    start();
    expect(cell(1, 1)).toBeInTheDocument();
  });

  test("the difficulty stays visible while playing", () => {
    setup();
    start();
    expect(screen.getByText(/medium/i)).toBeInTheDocument();
  });

  test("the timer is never shown while playing", () => {
    setup();
    start();
    expect(screen.queryByText(/\d:\d\d/)).toBeNull();
  });
});

describe("playing", () => {
  test("shows three hearts at the start", () => {
    setup();
    start();
    expect(screen.getByLabelText("3 hearts left")).toBeInTheDocument();
  });

  test("given cells are shown and cannot be edited", () => {
    setup();
    start();
    expect(cell(1, 1)).toHaveAccessibleName("Row 1, column 1, 5, given");
    fireEvent.click(cell(1, 1));
    fireEvent.click(pad(9));
    expect(cell(1, 1)).toHaveAccessibleName("Row 1, column 1, 5, given");
  });

  test("tapping a cell then a digit places a correct digit", () => {
    setup();
    start();
    fireEvent.click(cell(1, 3)); // solution digit is 4
    fireEvent.click(pad(4));
    expect(cell(1, 3)).toHaveAccessibleName("Row 1, column 3, 4");
    expect(screen.getByLabelText("3 hearts left")).toBeInTheDocument();
  });

  test("a wrong digit costs a heart, shakes the board and is not kept", () => {
    setup();
    start();
    fireEvent.click(cell(1, 3));
    fireEvent.click(pad(1));
    expect(screen.getByLabelText("2 hearts left")).toBeInTheDocument();
    expect(cell(1, 3)).toHaveAccessibleName("Row 1, column 3, empty");
    expect(screen.getByRole("group", { name: /sudoku board/i })).toHaveClass("shake");
  });

  test("losing the last heart shows the out-of-hearts message with the penalty and a heart back", () => {
    setup();
    start();
    fireEvent.click(cell(1, 3));
    for (let i = 0; i < 3; i++) fireEvent.click(pad(1));
    const overlay = screen.getByRole("dialog");
    expect(within(overlay).getByText(/out of hearts/i)).toBeInTheDocument();
    expect(within(overlay).getByText(/\+30s/)).toBeInTheDocument();
    expect(overlay.textContent?.toLowerCase()).not.toContain("oops");
    fireEvent.click(within(overlay).getByRole("button", { name: /keep going/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByLabelText("1 heart left")).toBeInTheDocument();
  });

  test("undo takes back a placed digit", () => {
    setup();
    start();
    fireEvent.click(cell(1, 3));
    fireEvent.click(pad(4));
    fireEvent.click(screen.getByRole("button", { name: /undo/i }));
    expect(cell(1, 3)).toHaveAccessibleName("Row 1, column 3, empty");
  });

  test("there is no redo button", () => {
    setup();
    start();
    expect(screen.queryByRole("button", { name: /redo/i })).toBeNull();
  });

  test("notes mode adds pencil marks instead of digits", () => {
    setup();
    start();
    fireEvent.click(screen.getByRole("button", { name: /notes/i }));
    fireEvent.click(cell(1, 3));
    fireEvent.click(pad(4));
    fireEvent.click(pad(7));
    expect(cell(1, 3)).toHaveAccessibleName("Row 1, column 3, empty, notes 4 7");
    expect(screen.getByLabelText("3 hearts left")).toBeInTheDocument();
  });

  test("erase clears the notes in the selected cell", () => {
    setup();
    start();
    fireEvent.click(screen.getByRole("button", { name: /notes/i }));
    fireEvent.click(cell(1, 3));
    fireEvent.click(pad(4));
    fireEvent.click(screen.getByRole("button", { name: /erase/i }));
    expect(cell(1, 3)).toHaveAccessibleName("Row 1, column 3, empty");
  });

  test("a digit with all nine placed is greyed out on the number pad", () => {
    // PUZZLE has only three 1s, so 1 is available; a nearly complete grid disables it.
    const almost = SOLUTION.replace("4", "0"); // blank the first 4 only
    setup({ batch: { startDate: "2026-12-01", puzzles: [{ difficulty: "easy", puzzle: almost, solution: SOLUTION }] } });
    start();
    expect(pad(4)).toBeEnabled();
    expect(pad(5)).toBeDisabled();
  });

  test("tapping a cell highlights its row, column and box, and matching digits", () => {
    setup();
    start();
    fireEvent.click(cell(1, 1)); // a given 5
    expect(cell(1, 2)).toHaveClass("peer"); // same row
    expect(cell(2, 1)).toHaveClass("peer"); // same column
    expect(cell(2, 2)).toHaveClass("peer"); // same box
    expect(cell(5, 5)).not.toHaveClass("peer");
    expect(cell(2, 6)).toHaveClass("match"); // the other 5 in row 2, col 6
    expect(cell(1, 1)).toHaveClass("selected");
  });
});
