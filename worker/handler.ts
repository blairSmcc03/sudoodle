import { boardFor, tally, type DayResult, type Player } from "../src/logic/leaderboard";
import { londonDateKey } from "../src/logic/schedule";
import { recordFinish, type Streak } from "../src/logic/streak";
import type { ResultStore } from "./store";

export interface WorkerEnv {
  store: ResultStore;
  tokens: Record<Player, string>;
  now: () => Date;
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

function playerFor(request: Request, tokens: Record<Player, string>): Player | null {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token === "") return null;
  if (token === tokens.her) return "her";
  if (token === tokens.him) return "him";
  return null;
}

function isRealDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    new Date(`${value}T00:00:00Z`).toISOString().startsWith(value)
  );
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function streakFor(player: Player, days: Record<string, DayResult[]>): Streak {
  let streak: Streak = { count: 0, lastDate: null };
  for (const date of Object.keys(days).sort()) {
    if (days[date]?.some((r) => r.player === player)) streak = recordFinish(streak, date);
  }
  return streak;
}

async function submit(request: Request, player: Player, env: WorkerEnv): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "invalid JSON" });
  }
  const b = body as Record<string, unknown> | null;
  if (typeof b !== "object" || b === null) return json(400, { error: "invalid body" });
  if (!isRealDate(b.date) || b.date > londonDateKey(env.now())) return json(400, { error: "invalid date" });
  if (!isCount(b.seconds) || !isCount(b.livesLost)) return json(400, { error: "invalid result" });
  await env.store.saveResult(b.date, { player, seconds: b.seconds, livesLost: b.livesLost });
  return json(200, { ok: true });
}

async function day(url: URL, player: Player, env: WorkerEnv): Promise<Response> {
  const date = url.searchParams.get("date") ?? londonDateKey(env.now());
  if (!isRealDate(date)) return json(400, { error: "invalid date" });
  const days = await env.store.allResults();
  const results = days[date] ?? [];
  const you = results.find((r) => r.player === player);
  const other = results.find((r) => r.player !== player);
  return json(200, {
    board: boardFor(you, other),
    tally: tally(days),
    streak: streakFor(player, days),
  });
}

export async function handleRequest(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const player = playerFor(request, env.tokens);
  if (!player) return json(401, { error: "unauthorised" });
  const url = new URL(request.url);
  if (request.method === "POST" && url.pathname === "/result") return submit(request, player, env);
  if (request.method === "GET" && url.pathname === "/day") return day(url, player, env);
  return json(404, { error: "not found" });
}
