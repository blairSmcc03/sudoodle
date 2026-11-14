import { describe, expect, test } from "vitest";
import { handleRequest, type WorkerEnv } from "./handler";
import { memoryResultStore } from "./memoryStore";

const HER = "her-secret-token";
const HIM = "him-secret-token";

function makeEnv(now = "2026-12-05T12:00:00Z"): WorkerEnv {
  return { store: memoryResultStore(), tokens: { her: HER, him: HIM }, now: () => new Date(now) };
}

function post(env: WorkerEnv, token: string | null, body: unknown) {
  return handleRequest(
    new Request("https://x.test/result", {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    }),
    env,
  );
}

function get(env: WorkerEnv, token: string | null, date = "2026-12-05") {
  return handleRequest(
    new Request(`https://x.test/day?date=${date}`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    }),
    env,
  );
}

const result = (seconds: number, livesLost = 0, date = "2026-12-05") => ({ date, seconds, livesLost });

describe("authentication", () => {
  test("a request with no token is rejected", async () => {
    expect((await get(makeEnv(), null)).status).toBe(401);
    expect((await post(makeEnv(), null, result(300))).status).toBe(401);
  });

  test("a request with the wrong token is rejected", async () => {
    expect((await get(makeEnv(), "nope")).status).toBe(401);
  });

  test("either player's token is accepted", async () => {
    expect((await get(makeEnv(), HER)).status).toBe(200);
    expect((await get(makeEnv(), HIM)).status).toBe(200);
  });
});

describe("submitting a result", () => {
  test("is accepted and then shows as waiting for the other player", async () => {
    const env = makeEnv();
    expect((await post(env, HER, result(300, 2))).status).toBe(200);
    const body = await (await get(env, HER)).json();
    expect(body.board).toEqual({ state: "waiting", you: { player: "her", seconds: 300, livesLost: 2 } });
  });

  test("submitting twice keeps the first result (retries are safe, times can't be improved)", async () => {
    const env = makeEnv();
    await post(env, HER, result(300));
    expect((await post(env, HER, result(100))).status).toBe(200);
    const body = await (await get(env, HER)).json();
    expect(body.board.you.seconds).toBe(300);
  });

  test("rejects malformed bodies", async () => {
    const env = makeEnv();
    for (const bad of [{}, result(-5), result(0.5), { ...result(300), date: "yesterday" }, { ...result(300), livesLost: -1 }, "text"]) {
      expect((await post(env, HER, bad)).status, JSON.stringify(bad)).toBe(400);
    }
  });

  test("rejects a date in the future", async () => {
    expect((await post(makeEnv(), HER, result(300, 0, "2026-12-06"))).status).toBe(400);
  });

  test("the player is taken from the token, never from the body", async () => {
    const env = makeEnv();
    await post(env, HER, { ...result(300), player: "him" });
    const body = await (await get(env, HER)).json();
    expect(body.board.you.player).toBe("her");
  });
});

describe("spoiler rules", () => {
  test("before you finish you only learn whether the other player has", async () => {
    const env = makeEnv();
    await post(env, HIM, result(250));
    const text = await (await get(env, HER)).text();
    expect(JSON.parse(text).board).toEqual({ state: "locked", otherFinished: true });
    expect(text).not.toContain("250");
  });

  test("once both have finished each sees both times and who won", async () => {
    const env = makeEnv();
    await post(env, HIM, result(250));
    await post(env, HER, result(300));
    const her = await (await get(env, HER)).json();
    const him = await (await get(env, HIM)).json();
    expect(her.board).toMatchObject({ state: "complete", outcome: "other" });
    expect(him.board).toMatchObject({ state: "complete", outcome: "you" });
    expect(her.board.other.seconds).toBe(250);
  });
});

describe("tally and streak", () => {
  test("the tally counts days both finished, from each viewer's own perspective labels (her/him)", async () => {
    const env = makeEnv("2026-12-03T12:00:00Z");
    await post(env, HER, result(100, 0, "2026-12-01"));
    await post(env, HIM, result(200, 0, "2026-12-01"));
    await post(env, HER, result(300, 0, "2026-12-02"));
    await post(env, HIM, result(250, 0, "2026-12-02"));
    const body = await (await get(env, HER, "2026-12-03")).json();
    expect(body.tally).toEqual({ her: 1, him: 1, draws: 0 });
  });

  test("a day only one player finished does not leak into the tally", async () => {
    const env = makeEnv();
    await post(env, HIM, result(250));
    expect((await (await get(env, HER)).json()).tally).toEqual({ her: 0, him: 0, draws: 0 });
  });

  test("the streak is the viewer's own consecutive finished days", async () => {
    const env = makeEnv("2026-12-03T12:00:00Z");
    for (const d of ["2026-12-01", "2026-12-02", "2026-12-03"]) await post(env, HER, result(100, 0, d));
    await post(env, HIM, result(100, 0, "2026-12-03"));
    expect((await (await get(env, HER, "2026-12-03")).json()).streak).toEqual({ count: 3, lastDate: "2026-12-03" });
    expect((await (await get(env, HIM, "2026-12-03")).json()).streak).toEqual({ count: 1, lastDate: "2026-12-03" });
  });

  test("a gap restarts the streak", async () => {
    const env = makeEnv("2026-12-05T12:00:00Z");
    for (const d of ["2026-12-01", "2026-12-02", "2026-12-04", "2026-12-05"]) await post(env, HER, result(100, 0, d));
    expect((await (await get(env, HER)).json()).streak.count).toBe(2);
  });
});

describe("routing and CORS", () => {
  test("unknown routes are 404", async () => {
    const res = await handleRequest(new Request("https://x.test/nope", { headers: { authorization: `Bearer ${HER}` } }), makeEnv());
    expect(res.status).toBe(404);
  });

  test("answers CORS preflight and allows the Authorization header", async () => {
    const res = await handleRequest(new Request("https://x.test/result", { method: "OPTIONS" }), makeEnv());
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-headers")).toMatch(/authorization/i);
  });

  test("responses carry CORS headers", async () => {
    expect((await get(makeEnv(), HER)).headers.get("access-control-allow-origin")).toBe("*");
  });
});
