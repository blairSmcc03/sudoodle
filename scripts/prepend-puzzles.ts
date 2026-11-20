/**
 * Adds puzzles for earlier days to public/puzzles.json, keeping every existing puzzle and date.
 *
 *   npx tsx scripts/prepend-puzzles.ts [newStartDate]    (default: today, Europe/London)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { seededRandom } from "../src/logic/difficulty";
import { londonDateKey, type PuzzleBatch } from "../src/logic/schedule";
import { createApiClient, prependDays } from "./batch";
import { readApiKey } from "./apiKey";

const apiKey = readApiKey(process.env, (path) => readFileSync(path, "utf8"));
if (!apiKey) {
  console.error("No API key found. Set YOUDOSUDOKU_API_KEY or put the key in api.key (see .env.example).");
  process.exit(1);
}

const file = "public/puzzles.json";
const existing = JSON.parse(readFileSync(file, "utf8")) as PuzzleBatch;
const newStart = process.argv[2] ?? londonDateKey(new Date());

const batch = await prependDays(existing, newStart, {
  random: seededRandom(Math.floor(Math.random() * 2 ** 31)),
  fetchPuzzle: createApiClient(apiKey),
});

writeFileSync(file, JSON.stringify(batch));
console.log(
  `Added ${batch.puzzles.length - existing.puzzles.length} puzzles; batch now runs from ${batch.startDate} (${batch.puzzles.length} days)`,
);
