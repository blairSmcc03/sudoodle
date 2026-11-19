# Sudoodle 🐶

A cute daily sudoku for one person, with a light-hearted time race against one other. See `PLAN.md` for the design decisions.

## Develop

```sh
npm install
npm run sample     # throwaway puzzles starting today -> public/puzzles.dev.json (dev only)
npm run dev        # http://localhost:5173
npm test           # unit + component tests (Vitest)
npm run e2e        # iPhone-viewport tests (Playwright, Chromium)
```

## Names and messages

Edit `config.json`: `names.her` (default `"user"`), `names.him` (`"Blair"`), `completionMessages`.
Nothing else hardcodes a name.

## Corgi art

Placeholder SVGs live in `public/corgi/` as `corgi-idle`, `corgi-happy`, `corgi-sad`, `corgi-celebrate`.
To use your own art, replace those files (keep the names; transparent background; rasters at least 600px wide
need the extension changed in `src/components/Corgi.tsx`).

## One-time setup to go live

1. **Puzzles.** Get a key from <https://www.youdosudoku.com>, then:
   ```sh
   cp .env.example .env            # put YOUDOSUDOKU_API_KEY in it
   export $(cat .env | xargs) && npm run puzzles    # 365 days from 2026-12-01 -> public/puzzles.json
   ```
   Re-run with `npm run puzzles -- 2027-12-01 365` for the next year. Commit `public/puzzles.json`.
2. **Leaderboard API (Cloudflare Worker + D1).** Wrangler is a dev dependency, so run it with `npx`.
   ```sh
   npx wrangler login                              # opens a browser to sign in to Cloudflare
   npx wrangler d1 create sudoodle                 # prints a database_id: paste it into wrangler.toml
   npx wrangler d1 migrations apply sudoodle --remote
   npm run tokens -- https://sudoodle.pages.dev    # your Pages URL (see below); prints tokens and setup links
   npx wrangler secret put TOKEN_HER               # paste her token when prompted
   npx wrangler secret put TOKEN_HIM               # paste his token when prompted
   npx wrangler deploy                             # prints the Worker URL
   ```
   Put the Worker URL in `config.json` as `apiUrl` (and your site URL as `siteUrl`).

   **Your site URL** is `https://<project-name>.pages.dev`, where the project name is the one you choose
   when creating the Pages project in step 3 (e.g. `sudoodle`). Cloudflare gives every Pages project this
   default domain; if the name is taken it adds a suffix, so check the **Domains** section of the project
   after the first deploy and use that exact address here.

   **Using the dashboard instead:** `wrangler login` is the only step that needs the terminal, and the
   dashboard can do the rest. Under **Workers & Pages → D1 SQL database**, create `sudoodle`, then open
   its **Console** and paste the contents of `worker/migrations/0001_results.sql`. Under the Worker's
   **Settings → Variables and Secrets**, add `TOKEN_HER` and `TOKEN_HIM` as secret values. Under
   **Settings → Bindings**, bind D1 with variable name `DB` to the `sudoodle` database. Then run
   `npx wrangler deploy` once so the Worker exists. Deployments made from the dashboard can overwrite
   the bindings in `wrangler.toml`, so keep the two in step.
3. **Site (Cloudflare Pages).** Build command `npm run build`, output directory `dist`.
4. **Pair each phone** once by opening its setup link. The token is stored on the device and removed from the URL.
   A phone without a token can still play; it just doesn't post to the leaderboard.

Never commit `.env` or the tokens.
