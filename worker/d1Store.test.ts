import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, test } from "vitest";
import { d1ResultStore, type D1Like } from "./d1Store";

/** Adapts an in-memory SQLite database to the slice of the D1 API we use. */
function sqliteAsD1(): D1Like {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("./migrations/0001_results.sql", import.meta.url), "utf8"));
  return {
    prepare(sql: string) {
      const statement = db.prepare(sql);
      return {
        bind(...params: unknown[]) {
          return {
            async run() {
              const info = statement.run(...(params as never[]));
              return { meta: { changes: Number(info.changes) } };
            },
            async all() {
              return { results: statement.all(...(params as never[])) as never[] };
            },
          };
        },
      };
    },
  } as D1Like;
}

describe("d1ResultStore", () => {
  test("a saved result comes back grouped by date", async () => {
    const store = d1ResultStore(sqliteAsD1());
    await store.saveResult("2026-12-01", { player: "her", seconds: 300, livesLost: 2 });
    await store.saveResult("2026-12-01", { player: "him", seconds: 280, livesLost: 0 });
    await store.saveResult("2026-12-02", { player: "her", seconds: 250, livesLost: 1 });
    expect(await store.allResults()).toEqual({
      "2026-12-01": [
        { player: "her", seconds: 300, livesLost: 2 },
        { player: "him", seconds: 280, livesLost: 0 },
      ],
      "2026-12-02": [{ player: "her", seconds: 250, livesLost: 1 }],
    });
  });

  test("the first result for a player and day wins; a second is ignored", async () => {
    const store = d1ResultStore(sqliteAsD1());
    expect(await store.saveResult("2026-12-01", { player: "her", seconds: 300, livesLost: 0 })).toBe(true);
    expect(await store.saveResult("2026-12-01", { player: "her", seconds: 100, livesLost: 0 })).toBe(false);
    expect((await store.allResults())["2026-12-01"]?.[0]?.seconds).toBe(300);
  });

  test("an empty database has no results", async () => {
    expect(await d1ResultStore(sqliteAsD1()).allResults()).toEqual({});
  });
});
