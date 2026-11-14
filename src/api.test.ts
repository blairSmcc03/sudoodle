import { describe, expect, test } from "vitest";
import { createHttpApi } from "./api";

const result = { date: "2026-12-05", seconds: 300, livesLost: 1 };

function fetchReturning(status: number, body: unknown = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("createHttpApi", () => {
  test("posts the result with the bearer token", async () => {
    const { impl, calls } = fetchReturning(200);
    expect(await createHttpApi("https://api.test", "tok", impl).postResult(result)).toBe("ok");
    expect(calls[0]?.url).toBe("https://api.test/result");
    expect((calls[0]?.init.headers as Record<string, string>).authorization).toBe("Bearer tok");
    expect(JSON.parse(calls[0]?.init.body as string)).toEqual(result);
  });

  test("a 400 or 401 means the server refused it for good", async () => {
    expect(await createHttpApi("https://api.test", "tok", fetchReturning(400).impl).postResult(result)).toBe("rejected");
    expect(await createHttpApi("https://api.test", "tok", fetchReturning(401).impl).postResult(result)).toBe("rejected");
  });

  test("a server error is treated as temporary so the result stays queued", async () => {
    await expect(createHttpApi("https://api.test", "tok", fetchReturning(503).impl).postResult(result)).rejects.toThrow();
  });

  test("getDay asks for the date and returns the board, tally and streak", async () => {
    const view = { board: { state: "locked", otherFinished: false }, tally: { her: 0, him: 0, draws: 0 }, streak: { count: 0, lastDate: null } };
    const { impl, calls } = fetchReturning(200, view);
    expect(await createHttpApi("https://api.test/", "tok", impl).getDay("2026-12-05")).toEqual(view);
    expect(calls[0]?.url).toBe("https://api.test/day?date=2026-12-05");
  });

  test("getDay throws when the server is unhappy", async () => {
    await expect(createHttpApi("https://api.test", "tok", fetchReturning(500).impl).getDay("2026-12-05")).rejects.toThrow();
  });
});
