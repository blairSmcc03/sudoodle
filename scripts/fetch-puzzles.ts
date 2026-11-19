/**
 * Builds public/puzzles.json from the YouDoSudoku API.
 *
 *   YOUDOSUDOKU_API_KEY=... npx tsx scripts/fetch-puzzles.ts [startDate] [days]
 *
 * Defaults: start 2026-12-01, 365 days. The key comes from YOUDOSUDOKU_API_KEY or api.key.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { seededRandom } from "../src/logic/difficulty";
import { buildBatch, createApiClient } from "./batch";
import { readApiKey } from "./apiKey";

const apiKey = readApiKey(process.env, (path) => readFileSync(path, "utf8"));
if (!apiKey) {
  console.error("No API key found. Set YOUDOSUDOKU_API_KEY or put the key in api.key (see .env.example).");
  process.exit(1);
}

const startDate = process.argv[2] ?? "2026-12-01";
const days = Number(process.argv[3] ?? 365);

// A fresh random seed each run; the result is saved, so it doesn't need to be reproducible.
const seed = Math.floor(Math.random() * 2 ** 31);

const batch = await buildBatch({
  startDate,
  days,
  random: seededRandom(seed),
  fetchPuzzle: createApiClient(apiKey),
});

mkdirSync("public", { recursive: true });
writeFileSync("public/puzzles.json", JSON.stringify(batch));
console.log(`Wrote ${batch.puzzles.length} puzzles from ${startDate} to public/puzzles.json`);
