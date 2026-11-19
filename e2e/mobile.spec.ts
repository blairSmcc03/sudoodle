import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // The real batch starts in December, so use the dev sample (today's date) for the layout tests.
  await page.goto("/?puzzles=dev");
  await page.getByRole("button", { name: /start/i }).click();
  await page.locator(".board").waitFor();
});

test("the play screen fits the viewport with no scrolling", async ({ page }) => {
  const { scrollW, scrollH, vw, vh } = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    scrollH: document.documentElement.scrollHeight,
    vw: innerWidth,
    vh: innerHeight,
  }));
  expect(scrollW).toBeLessThanOrEqual(vw);
  expect(scrollH).toBeLessThanOrEqual(vh);
});

test("the board is square and the number pad stays on screen", async ({ page }) => {
  const board = (await page.locator(".board").boundingBox())!;
  expect(Math.abs(board.width - board.height)).toBeLessThan(2);
  const pad = (await page.locator(".pad").boundingBox())!;
  const vh = page.viewportSize()!.height;
  expect(pad.y + pad.height).toBeLessThanOrEqual(vh);
});

test("cells are big enough to tap", async ({ page }) => {
  const cell = (await page.locator(".cell").first().boundingBox())!;
  expect(cell.width).toBeGreaterThanOrEqual(30);
});

test("a wrong digit shakes the board and drops a heart", async ({ page }) => {
  // The first empty cell in the sample puzzle is row 1, column 3; a digit that is surely wrong
  // is any digit that's already given in its row.
  const given = await page.locator(".cell.given").first().getAttribute("aria-label");
  const wrong = Number(given!.match(/, (\d), given/)![1]);
  await page.getByRole("button", { name: /^Row 1, column 3,/ }).click();
  await page.getByRole("button", { name: new RegExp(`^Digit ${wrong}`) }).click();
  await expect(page.getByLabel("2 hearts left")).toBeVisible();
  await expect(page.locator(".board")).toHaveClass(/shake/);
});

test("no timer is visible while playing", async ({ page }) => {
  await expect(page.getByText(/^\d+:\d\d$/)).toHaveCount(0);
});
