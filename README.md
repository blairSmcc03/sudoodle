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
2. **Leaderboard API (Cloudflare Worker + D1).**
   ```sh
   npx wrangler d1 create sudoodle                 # paste the id into wrangler.toml
   npx wrangler d1 migrations apply sudoodle --remote
   npm run tokens -- https://your-site.pages.dev   # prints two tokens and two setup links
   npx wrangler secret put TOKEN_HER               # paste her token
   npx wrangler secret put TOKEN_HIM               # paste his token
   npx wrangler deploy
   ```
   Put the Worker URL in `config.json` as `apiUrl` (and your site URL as `siteUrl`).
3. **Site (Cloudflare Pages).** Build command `npm run build`, output directory `dist`.
4. **Pair each phone** once by opening its setup link. The token is stored on the device and removed from the URL.
   A phone without a token can still play; it just doesn't post to the leaderboard.

Never commit `.env` or the tokens.
