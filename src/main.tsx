import { render } from "preact";
import { App } from "./App";
import { createHttpApi } from "./api";
import config from "../config.json";
import { loadToken, pairFromUrl } from "./pairing";
import { puzzleSourceFor } from "./puzzleSource";
import type { PuzzleBatch } from "./logic/schedule";
import "./styles.css";

async function fetchBatch(url: string): Promise<PuzzleBatch | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const batch = (await response.json()) as PuzzleBatch;
    return Array.isArray(batch.puzzles) ? batch : null;
  } catch {
    return null; // a dev server may answer a missing file with index.html
  }
}

/**
 * Loads the real batch. In a dev build only, `?puzzles=dev` loads the throwaway sample instead
 * (used by the e2e tests, since the real batch may not have started yet). Production builds
 * ignore the flag, so it can't unlock anything.
 */
async function loadBatch(): Promise<PuzzleBatch> {
  const base = import.meta.env.BASE_URL;
  const file = puzzleSourceFor({ dev: import.meta.env.DEV, search: window.location.search });
  const batch = await fetchBatch(`${base}${file}`);
  if (!batch) throw new Error("Could not load puzzles");
  return batch;
}

async function main() {
  const root = document.getElementById("app")!;
  const cleaned = pairFromUrl(localStorage, window.location.href);
  if (cleaned) window.history.replaceState(null, "", cleaned);
  const token = loadToken(localStorage);

  try {
    const batch = await loadBatch();
    const siteUrl = config.siteUrl || window.location.origin;
    render(
      <App
        batch={batch}
        config={{ ...config, siteUrl }}
        clock={() => new Date()}
        store={localStorage}
        api={token && config.apiUrl ? createHttpApi(config.apiUrl, token) : undefined}
        share={
          typeof navigator.share === "function"
            ? (text) => navigator.share({ text })
            : undefined
        }
        copy={(text) => navigator.clipboard.writeText(text)}
      />,
      root,
    );
  } catch {
    root.textContent = "Couldn't load today's puzzle. Please refresh 🐾";
  }
}

void main();
