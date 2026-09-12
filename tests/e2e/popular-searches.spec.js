import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/index.html");
  await page.waitForSelector("#name-input:not([disabled])", { timeout: 30000 });
});

test("shows exactly 50 popular numbers and 50 popular phrases", async ({ page }) => {
  await expect(page.locator("#popular-numbers .popular-chip")).toHaveCount(50);
  await expect(page.locator("#popular-phrases .popular-chip")).toHaveCount(50);
});

test("clicking a popular chip runs that search and adds it to Recent Searches", async ({ page }) => {
  // Regression test: the disclosure toggle and its chips were once
  // unclickable because the input's blur handler synchronously re-rendered
  // Recent Searches, shifting the layout mid-click so the mouseup landed on
  // the wrong element. Opening the panel and clicking a chip exercises that
  // exact click.
  await page.click("#popular-searches summary");
  await expect(page.locator("#popular-searches")).toHaveJSProperty("open", true);

  const chipText = await page.locator("#popular-numbers .popular-chip").first().textContent();
  await page.locator("#popular-numbers .popular-chip").first().click();

  await expect(page.locator("#name-input")).toHaveValue(chipText);
  await expect(page.locator(".value-number")).toHaveText(chipText);
  await expect(page.locator(".recent-chip").first()).toHaveText(chipText);
});
