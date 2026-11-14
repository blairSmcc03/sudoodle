// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/preact";
import { App, type AppProps } from "./App";
import { SOLUTION } from "./logic/fixtures";
import type { KeyValueStore } from "./logic/persistence";
import type { DayView, LeaderboardApi } from "./api";
import { pendingResults } from "./sync";

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

// One empty cell (row 1, column 1); the answer is 5.
const ALMOST = "0" + SOLUTION.slice(1);
const batch = {
  startDate: "2026-12-01",
  puzzles: [{ difficulty: "medium" as const, puzzle: ALMOST, solution: SOLUTION }],
};

const cell11 = () => screen.getByRole("button", { name: /^Row 1, column 1,/ });
const pad = (d: number) => screen.getByRole("button", { name: new RegExp(`^Digit ${d}`) });

function fakeClock(startIso = "2026-12-01T10:00:00Z") {
  let t = Date.parse(startIso);
  return { clock: () => new Date(t), advance: (ms: number) => void (t += ms) };
}

const noView: DayView = {
  board: { state: "waiting", you: { player: "her", seconds: 0, livesLost: 0 } },
  tally: { her: 0, him: 0, draws: 0 },
  streak: { count: 1, lastDate: "2026-12-01" },
};

function fakeApi(view: Partial<DayView> = {}, online = true): LeaderboardApi & { posted: unknown[] } {
  const posted: unknown[] = [];
  return {
    posted,
    async postResult(r) {
      if (!online) throw new TypeError("offline");
      posted.push(r);
      return "ok";
    },
    async getDay() {
      if (!online) throw new TypeError("offline");
      return { ...noView, ...view };
    },
  };
}

function setup(overrides: Partial<AppProps> = {}) {
  const time = fakeClock();
  const props: AppProps = { batch, config, clock: time.clock, store: memoryStore(), ...overrides };
  const view = render(<App {...props} />);
  return { props, time, ...view };
}

async function winAfter(time: { advance(ms: number): void }, ms: number) {
  fireEvent.click(screen.getByRole("button", { name: /start/i }));
  time.advance(ms);
  fireEvent.click(cell11());
  await act(async () => {
    fireEvent.click(pad(5));
  });
}

describe("finishing", () => {
  test("reveals the time only at the end, as the active time", async () => {
    const { time } = setup();
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(screen.queryByText(/\d:\d\d/)).toBeNull();
    time.advance(65_000);
    fireEvent.click(cell11());
    await act(async () => void fireEvent.click(pad(5)));
    expect(screen.getByText("1:05")).toBeInTheDocument();
  });

  test("shows a completion message from the config and the difficulty", async () => {
    const { time } = setup();
    await winAfter(time, 10_000);
    expect(screen.getByText("You did it! 🐾")).toBeInTheDocument();
  });

  test("time spent with the page hidden is not counted", async () => {
    const { time } = setup();
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    time.advance(10_000);
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    time.advance(600_000);
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    time.advance(5_000);
    fireEvent.click(cell11());
    await act(async () => void fireEvent.click(pad(5)));
    expect(screen.getByText("0:15")).toBeInTheDocument();
  });

  test("adds 30s for every time the hearts ran out and says how many lives were lost", async () => {
    const { time } = setup();
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    fireEvent.click(cell11());
    for (let i = 0; i < 3; i++) fireEvent.click(pad(1));
    fireEvent.click(screen.getByRole("button", { name: /keep going/i }));
    time.advance(20_000);
    await act(async () => void fireEvent.click(pad(5)));
    expect(screen.getByText("0:50")).toBeInTheDocument();
    expect(screen.getByText(/3 lives lost/)).toBeInTheDocument();
  });

  test("shows confetti, once", async () => {
    const { time } = setup();
    await winAfter(time, 1_000);
    expect(document.querySelectorAll(".confetti-piece").length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".confetti-piece").length).toBeLessThan(80);
  });

  test("shows a countdown to the next puzzle that ticks", async () => {
    vi.useFakeTimers();
    try {
      const { time } = setup();
      await winAfter(time, 1_000);
      // 10:00:01Z in winter: 13:59:59 left until midnight London time
      expect(screen.getByText(/13:59:59/)).toBeInTheDocument();
      time.advance(1_000);
      await act(async () => void vi.advanceTimersByTime(1_000));
      expect(screen.getByText(/13:59:58/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  test("the board is no longer playable and the puzzle stays locked after a reload", async () => {
    const { time, props, unmount } = setup();
    await winAfter(time, 12_000);
    unmount();
    render(<App {...props} />);
    expect(screen.getByText("0:12")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Digit 5/ })).toBeNull();
  });
});

describe("resuming after a reload mid-game", () => {
  test("restores the time already spent", async () => {
    const { time, props, unmount } = setup();
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    time.advance(20_000);
    fireEvent.click(cell11()); // any state change triggers a save
    unmount();
    time.advance(3_600_000); // an hour away from the game
    render(<App {...props} />);
    time.advance(5_000);
    fireEvent.click(cell11());
    await act(async () => void fireEvent.click(pad(5)));
    expect(screen.getByText("0:25")).toBeInTheDocument();
  });
});

describe("sharing", () => {
  test("shares the spoiler-free text through the share sheet when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const { time } = setup({ share });
    await winAfter(time, 402_000);
    await act(async () => void fireEvent.click(screen.getByRole("button", { name: /share/i })));
    expect(share).toHaveBeenCalledWith("Sudoodle · 1 Dec · Medium · ⏱ 6:42 · 💖 no lives lost\nhttps://sudoodle.test");
  });

  test("falls back to copying when there is no share sheet", async () => {
    const copy = vi.fn().mockResolvedValue(undefined);
    const { time } = setup({ copy });
    await winAfter(time, 5_000);
    await act(async () => void fireEvent.click(screen.getByRole("button", { name: /share/i })));
    expect(copy).toHaveBeenCalledOnce();
    expect(screen.getByText(/copied/i)).toBeInTheDocument();
  });
});

describe("leaderboard", () => {
  test("without a paired device, the game works and nothing is posted", async () => {
    const { time } = setup();
    await winAfter(time, 5_000);
    expect(screen.queryByText(/waiting for/i)).toBeNull();
    expect(screen.getByText("0:05")).toBeInTheDocument();
  });

  test("posts the final result and shows waiting for the other player", async () => {
    const api = fakeApi();
    const { time } = setup({ api });
    await winAfter(time, 65_000);
    expect(await screen.findByText(/waiting for Blair/i)).toBeInTheDocument();
    expect(api.posted).toEqual([{ date: "2026-12-01", seconds: 65, livesLost: 0 }]);
  });

  test("shows both times and a win when she is faster", async () => {
    const api = fakeApi({
      board: {
        state: "complete",
        you: { player: "her", seconds: 65, livesLost: 0 },
        other: { player: "him", seconds: 90, livesLost: 1 },
        outcome: "you",
      },
      tally: { her: 3, him: 2, draws: 0 },
    });
    const { time } = setup({ api });
    await winAfter(time, 65_000);
    expect(await screen.findByText("1:30")).toBeInTheDocument();
    expect(screen.getByText(/Sam 3 – 2 Blair/)).toBeInTheDocument();
  });

  test("shows a win message for the faster player", async () => {
    const api = fakeApi({
      board: {
        state: "complete",
        you: { player: "her", seconds: 65, livesLost: 0 },
        other: { player: "him", seconds: 90, livesLost: 1 },
        outcome: "you",
      },
    });
    const { time } = setup({ api });
    await winAfter(time, 65_000);
    expect(await screen.findByText(/Sam wins today/)).toBeInTheDocument();
  });

  test("shows the other player's win when she is slower", async () => {
    const api = fakeApi({
      board: {
        state: "complete",
        you: { player: "her", seconds: 100, livesLost: 0 },
        other: { player: "him", seconds: 90, livesLost: 0 },
        outcome: "other",
      },
    });
    const { time } = setup({ api });
    await winAfter(time, 100_000);
    expect(await screen.findByText(/Blair wins today/)).toBeInTheDocument();
  });

  test("a tie is shown as a draw", async () => {
    const api = fakeApi({
      board: {
        state: "complete",
        you: { player: "her", seconds: 65, livesLost: 0 },
        other: { player: "him", seconds: 65, livesLost: 0 },
        outcome: "draw",
      },
    });
    const { time } = setup({ api });
    await winAfter(time, 65_000);
    expect(await screen.findByText(/a draw/i)).toBeInTheDocument();
  });

  test("offline: shows her time and a gentle sync note, and queues the result", async () => {
    const store = memoryStore();
    const { time } = setup({ api: fakeApi({}, false), store });
    await winAfter(time, 5_000);
    expect(await screen.findByText(/will sync soon/i)).toBeInTheDocument();
    expect(screen.getByText("0:05")).toBeInTheDocument();
    expect(pendingResults(store)).toHaveLength(1);
  });

  test("shows the streak", async () => {
    const api = fakeApi({ streak: { count: 4, lastDate: "2026-12-01" } });
    const { time } = setup({ api });
    await winAfter(time, 5_000);
    expect(await screen.findByText(/4 day streak/i)).toBeInTheDocument();
  });
});
