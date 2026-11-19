/** Which batch file to load. The sample is only ever used in a dev build, on request. */
export function puzzleSourceFor({ dev, search }: { dev: boolean; search: string }): string {
  const wantsSample = new URLSearchParams(search).get("puzzles") === "dev";
  return dev && wantsSample ? "puzzles.dev.json" : "puzzles.json";
}
