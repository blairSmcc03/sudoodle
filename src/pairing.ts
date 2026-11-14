import type { KeyValueStore } from "./logic/persistence";

const TOKEN_KEY = "sudoodle.token";

export function loadToken(store: KeyValueStore): string | null {
  try {
    return store.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Handles a setup link (`/?token=...&as=...`): stores the token and returns the URL with the
 * token removed, so it doesn't linger in the address bar or history. Returns null if the
 * URL has no token.
 */
export function pairFromUrl(store: KeyValueStore, href: string): string | null {
  const url = new URL(href);
  const token = url.searchParams.get("token");
  if (token === null) return null;
  if (token !== "") {
    try {
      store.setItem(TOKEN_KEY, token);
    } catch {
      // Storage unavailable: this device just stays unpaired.
    }
  }
  url.searchParams.delete("token");
  url.searchParams.delete("as");
  return url.toString();
}
