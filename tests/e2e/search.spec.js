import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/index.html");
  await page.waitForSelector("#name-input:not([disabled])", { timeout: 30000 });
});

test("loads with the default search already computed", async ({ page }) => {
  await expect(page.locator(".value-number")).not.toHaveText("–");
  await expect(page.locator("#results-meta")).toContainText("match");
});

test("typing a Hebrew word updates the Standard Value and finds real matches", async ({ page }) => {
  await page.fill("#name-input", "יאשיהו");
  await expect(page.locator(".value-number")).toHaveText("332");

  // Regression test: a prior findMatches shape bug made every search
  // silently return zero results no matter the value. 332 has 65 known
  // word matches across the corpus (64 once the searched word excludes
  // itself) — Tanakh plus Mishnah, now that both are merged into one index.
  await expect(page.locator(".tab").first()).toContainText("Words (64)");
});

test("a plain number is searched as a direct target value", async ({ page }) => {
  await page.fill("#name-input", "613");
  await expect(page.locator(".value-number")).toHaveText("613");
  await expect(page.locator("#numeral-hint")).toBeVisible();
  await expect(page.locator("#numeral-hint")).toContainText("תרי״ג");
});

test("a known notable value shows its callout", async ({ page }) => {
  await page.fill("#name-input", "יהוה");
  await expect(page.locator(".value-number")).toHaveText("26");
  await expect(page.locator("#notable-value")).toBeVisible();
  await expect(page.locator("#notable-value")).toContainText("Tetragrammaton");
});
