/**
 * Finds the YouDoSudoku key. The environment variable wins; otherwise the local, git-ignored
 * `api.key` file is used. The key is never printed.
 */
export function readApiKey(
  env: Record<string, string | undefined>,
  readFile: (path: string) => string,
): string | null {
  const fromEnv = env.YOUDOSUDOKU_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  try {
    const fromFile = readFile("api.key").trim();
    return fromFile === "" ? null : fromFile;
  } catch {
    return null;
  }
}
