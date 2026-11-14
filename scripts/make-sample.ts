/** Writes public/puzzles.dev.json with throwaway puzzles starting today. Dev use only. */
import { mkdirSync, writeFileSync } from "node:fs";
import { londonDateKey } from "../src/logic/schedule";
import { buildSampleBatch } from "./sample";

mkdirSync("public", { recursive: true });
const batch = buildSampleBatch(process.argv[2] ?? londonDateKey(new Date()), 365);
writeFileSync("public/puzzles.dev.json", JSON.stringify(batch));
console.log(`Wrote sample puzzles from ${batch.startDate} to public/puzzles.dev.json (NOT for production)`);
