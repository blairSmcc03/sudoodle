/**
 * Builds public/puzzles.json from the YouDoSudoku API.
 *
 *   YOUDOSUDOKU_API_KEY=... npx tsx scripts/fetch-puzzles.ts [startDate] [days]
 *
 * Defaults: start 2026-12-01, 365 days. The API key is read from the environment only.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { seededRandom } from "../src/logic/difficulty";
import { buildBatch, createApiClient } from "./batch";

const apiKey = process.env.YOUDOSUDOKU_API_KEY;
if (!apiKey) {
  console.error("Set YOUDOSUDOKU_API_KEY (see .env.example).");
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
