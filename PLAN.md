# Sudoodle: PLAN

> Status: **design tree complete, awaiting confirmation to start the build.** Updated after each round of decisions.
> Development follows TDD (red → green → refactor, one vertical slice at a time).

## Goal
A cute, mobile-first daily sudoku web page for one person (my girlfriend), opened in a normal mobile browser (both of us use iOS Safari), with a light-hearted daily time comparison against me. Pink and pastel, with a corgi mascot.

## Facts about the puzzle source (YouDoSudoku API)
- Endpoint: `POST https://www.youdosudoku.com/api` (no trailing slash; `/api/` 308-redirects).
- Requires an `x-api-key` header. The key is secret, so it is never shipped to the browser.
- Limits: 5,000 requests/month, 60/minute.
- Body: `{ "difficulty": "easy" | "medium" | "hard", "solution": boolean, "array": boolean }`.
- Returns an 81-char puzzle string (plus an optional solution). Every call is random, with no date seeding.
- No CORS support seen, so it can't be called from the browser.
- **Consequence:** "daily" is built by us. A build-time script calls the API and assigns puzzles to dates.

## Decisions (settled)

### Product
| Area | Decision |
|------|----------|
| Audience | Just for her. No login or accounts. |
| Names | `config.json` holds the display names: her name (**default `"user"`**) and mine (**`"Blair"` for now**). Both are **reconfigurable** in `config.json` only, and no name is hardcoded anywhere else (UI, share text and Worker all read the config). Completion messages are in an editable JSON file. |
| Delivery | **A plain web page in the browser.** Not a PWA (no install, no service worker, no manifest). Mobile-first, portrait-first, tuned for **iOS Safari**. |
| Daily puzzle | One fixed puzzle per calendar day, identical on every device. Only today's puzzle is playable. No past days, no calendar, no history UI. |
| Day boundary | **Midnight in `Europe/London`**, so it follows the GMT/BST clock change. Computed with `Intl.DateTimeFormat` using a constant timezone, so every device agrees. |
| Difficulty | Random per day, weighted **30% easy / 40% medium / 30% hard**, with **no difficulty on more than 2 days in a row**. Fixed when the batch is built. **Always displayed** on the puzzle screen. |
| Streak | Finishing the day's puzzle counts. A missed day resets the streak to 0, with a gentle message. **Stored in the Worker** (keyed by her token), with a localStorage cache. |

### Gameplay
| Area | Decision |
|------|----------|
| Wording | Player-facing text says **"lives"** / **"hearts"** and never "oops". The all-hearts-lost overlay reads "Out of hearts! +30s, here's one back 💗". The end screen shows "💔 N lives lost". The internal name is `heartsDepleted`. |
| Features | Notes (pencil marks), erase, **undo only (no redo)**, row / column / box highlight, matching-digit highlight, auto-clearing of notes, greying-out of completed digits on the number pad. **No hints, no pause.** |
| Mistakes | Only a digit that contradicts the solution counts as a mistake. The board **shakes**, a heart is lost, and the wrong digit is **removed automatically**. Digits that merely conflict with another digit are not mistakes. **Undo never gives a heart back.** |
| Lives | **3 hearts.** When the last heart is lost, the "Out of hearts!" overlay appears (sad corgi). The game goes on **on the same board** with **1 heart**, and **+30s** is added to the time. Each further time the hearts run out is another +30s and 1 heart. |
| Start | A **"Ready?" splash** with the corgi and a Start button. The puzzle stays hidden and the clock starts at the tap. |
| Timer | **Hidden while playing, revealed at the end.** Counts **foreground time only** (Page Visibility API), no pause. Final time = active time + 30s per depletion. A reload mid-game restores the elapsed active time. |
| Feedback | The shake is the only mistake feedback. **No haptics** (iOS has no `navigator.vibrate`). No sound. |
| Finish | Light **confetti**, kept tasteful. Then the results screen with the leaderboard and a **live countdown to the next puzzle** (hh:mm:ss until the next Europe/London midnight). The countdown handles 23h and 25h clock-change days. At zero it turns into a "New puzzle ready 🐶" button that loads the new day. |
| UI principle | **Keep the UI clean.** Only essential elements on the play screen: difficulty badge, hearts, small corgi, board, number pad and a few controls (notes, erase, undo). |

### Leaderboard
| Area | Decision |
|------|----------|
| What | Her final time against my final time for the day, light-hearted, with a running wins tally. A day counts as a win for the faster time. A draw (the same time) is "💞 a draw" and counts for no one. |
| Spoilers | The same rule in both directions. Before you finish, you only see "<name> has finished! 👀" with **no time**. **The leaderboard appears after you complete the puzzle.** |
| Sharing | A **"share your time" button** on the results screen, using the iOS share sheet (`navigator.share`) with Copy as the fallback. **Spoiler-free text only, no puzzle digits.** It includes the date, difficulty, final time and **lives lost** (the word "oops" is not used), for example `Sudoodle · 2 Dec · Medium · ⏱ 06:42 · 💔 4 lives lost` plus the site URL. The text is **identical regardless of the day's result** (no "beat Blair" line). |
| Backend | A **Cloudflare Worker + D1**. Endpoints roughly `POST /result`, `GET /today`. |
| Identity | **Two fixed player slots.** Each device is paired once through a setup link `/?token=…`. The page stores the token in localStorage and removes it from the URL. Tokens live in Worker secrets, never in the repo. `scripts/make-tokens` prints the two links. A device with no token can still play but doesn't post. |
| Offline / sync | The game never blocks on the network. A result is queued in localStorage and retried on the next page load and on the browser `online` event. Meanwhile she sees her time and "will sync soon 🐾". The leaderboard shows "waiting for <name>…" until the other has played. |

### Look and feel
| Area | Decision |
|------|----------|
| Palette | Pink and pastel, **light mode only**. |
| Font | **Nunito.** |
| Mascot | **Corgi**, small beside the hearts during play, reacting to completed rows / columns / boxes (happy) and lost hearts (wince). Full-size on the Ready, hearts-depleted and results screens. Poses: idle, happy, sad, celebrate. **I generate placeholder SVGs** (`corgi-idle.svg`, `corgi-happy.svg`, `corgi-sad.svg`, `corgi-celebrate.svg`) now. Real art, found later by Blair, replaces them by file swap (PNG/WebP/SVG all work, transparent background, ≥600px wide for rasters). The art lives in one component. |
| Home screen | `apple-touch-icon` (corgi face on pink), page title, and a tiny web manifest with `display: standalone` and **no service worker**. The page works as a normal browser page either way. |
| Mobile | `viewport-fit=cover`, safe-area insets, `100dvh`, `touch-action: manipulation` (no double-tap zoom), tap targets ≥ 44px, a square board sized to the viewport width, and a number pad within thumb reach. |

### Tech and delivery
| Area | Decision |
|------|----------|
| Front end | **Vite + TypeScript + Preact**, plain CSS with CSS variables, no UI framework. |
| Tests | **Vitest** for unit and component tests, **Playwright** at iPhone viewports (WebKit). |
| Puzzle supply | **Pre-fetched batch.** A script calls the API at build time and writes a static `puzzles.json` including the solutions. |
| Batch | **365 days starting 2026-12-01** (read as 1 December 2026). Before that date the page shows a friendly "coming soon" screen. A warning appears when fewer than 30 days remain. |
| Hosting | **Cloudflare Pages** (site) + **Worker + D1** (API). CI runs the tests. |

## Confirmed defaults
- If midnight passes mid-puzzle, she finishes the puzzle she started, and the result counts for that puzzle's date.
- After finishing, the day's puzzle is locked. She can't replay it, and she sees the results screen again on reopening.
- A wrong digit still counts as a mistake even if the time is already large. There is no cap on how many times the hearts can run out.
- The API key is generated by me on youdosudoku.com and goes in `.env` (local) and a CI secret. It is never committed.

- The share text counts total lives lost across the whole game, not the number of times the hearts ran out.
- After finishing, the results screen shows a countdown to the next puzzle.

## Open questions
None. Next step: Blair confirms, then the TDD build starts with slice 1.

## Architecture (draft)
- **Static site**: Vite + TypeScript + Preact. Today's puzzle comes from `puzzles.json`, chosen by the Europe/London date.
- **Worker API** (Cloudflare Worker + D1): `POST /result`, `GET /today`, authenticated by the player token.
- **Batch script** (`scripts/fetch-puzzles.ts`): reads the API key from the environment, builds the difficulty schedule, fetches the puzzles, and writes `puzzles.json`.
- **Pure logic modules** stay free of DOM and network code, so they are fast to unit test.

## TDD slices (draft)
Each slice starts with a failing test and ends with refactoring. Pure logic comes first, UI last.
1. **Grid logic**: parse the 81-char string, row / column / box peers, conflicts, completion, matching digits
2. **Daily schedule**: date → puzzle in `Europe/London` (including both clock-change days), difficulty schedule (weights, max run of 2, deterministic with a seed), before-start and after-end handling
3. **Game reducer**: enter digit, notes, erase, undo, auto-clearing notes, number pad counts, mistakes, hearts, heartsDepleted (+30s, 1 heart back), win
4. **Countdown**: time until next Europe/London midnight (injectable clock, 23h / 24h / 25h days, rollover at zero)
5. **Active timer**: foreground-only accounting with an injectable clock and visibility source, penalties, reveal at the end, restore after reload
6. **Persistence**: today's progress survives a reload (localStorage), locked after finishing, midnight handling
7. **Leaderboard (Worker)**: auth, submit, fetch, ranking, draws, spoiler rules, tally, streak, tested against an in-memory D1 stand-in
8. **Sync client**: offline queue, retry on load and on `online`, idempotent submit
9. **UI components**: Ready splash, board, number pad, hearts, shake, difficulty badge, out-of-hearts overlay, results screen, share (component tests plus Playwright at iPhone viewports)
10. **Corgi mascot**: pose state machine (idle / happy / sad / celebrate) tested first, then the placeholder SVGs I generate
11. **Batch script**: API client (mocked), assigns difficulty and dates, validates puzzle strings, writes JSON
12. **Deployment**: Cloudflare Pages + Worker, CI running the tests
