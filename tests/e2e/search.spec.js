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
  // silently return zero results no matter the value. 332 has 42 known
  // Tanakh word matches (41 once the searched word excludes itself).
  await expect(page.locator(".tab").first()).toContainText("Words (41)");
});

test("Mishnah results show the Joshua Kulp English translation, not JPS", async ({ page }) => {
  // Mishnah has its own CC-BY English translation (see build_mishnah.py)
  // distinct from Tanakh's JPS 1917 — the "lang-label" text is per-corpus,
  // not the hardcoded "JPS 1917 translation" string it used to be.
  await page.fill("#name-input", "501");
  await page.click('.corpus-tab:has-text("Mishnah")');
  await page.waitForTimeout(300);
  await expect(page.locator(".lang-label").first()).toHaveText("Joshua Kulp translation");
  await expect(page.locator(".verse-text-en").first()).not.toHaveText("");
});

test("switching the corpus tab searches a completely separate index", async ({ page }) => {
  await page.fill("#name-input", "יאשיהו דוד עזריאל לישאביץ");
  await expect(page.locator(".value-number")).toHaveText("1107");
  const tanakhTabs = await page.locator(".tab").allTextContents();

  await page.click('.corpus-tab:has-text("Mishnah")');
  const mishnahTabs = await page.locator(".tab").allTextContents();
  expect(mishnahTabs).not.toEqual(tanakhTabs);

  await page.click('.corpus-tab:has-text("Mishneh Torah")');
  const mishnehTorahTabs = await page.locator(".tab").allTextContents();
  expect(mishnehTorahTabs).not.toEqual(tanakhTabs);
  expect(mishnehTorahTabs).not.toEqual(mishnahTabs);

  await page.click('.corpus-tab:has-text("Tanakh")');
  await expect(page.locator(".tab").first()).toHaveText(tanakhTabs[0]);
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

test("searching never rewrites the address bar on its own", async ({ page }) => {
  // Regression test: an earlier version synced ?q= into the address bar
  // automatically on every keystroke. That silently broke "Add to Home
  // Screen" — iOS captures whatever URL is showing at the moment the icon
  // is added, so a home-screen launch could reopen to a half-typed search
  // instead of the app's real default (see the Copy Link tests in
  // copy-markdown.spec.js for the opt-in replacement).
  await page.fill("#name-input", "חיים");
  await expect(page.locator(".value-number")).toHaveText("68");
  await expect(page).not.toHaveURL(/[?&]q=/);
});

test("a shared ?q= link reopens that search", async ({ page }) => {
  // Loading the whole corpus takes ~20s and this test boots the app a
  // second time (beforeEach already did one), so it legitimately needs
  // more than the default per-test budget.
  test.slow();
  await page.goto(`/index.html?q=${encodeURIComponent("חיים")}`);
  await page.waitForSelector("#name-input:not([disabled])", { timeout: 60000 });
  await expect(page.locator("#name-input")).toHaveValue("חיים");
  await expect(page.locator(".value-number")).toHaveText("68");
});

test("non-Hebrew input explains itself instead of reporting zero matches", async ({ page }) => {
  // Typing a Latin name is a likely first move for someone who doesn't
  // read Hebrew; "0 matches for value 0" reads as broken rather than as
  // the wrong alphabet.
  await page.fill("#name-input", "David");
  await expect(page.locator("#numeral-hint")).toBeVisible();
  await expect(page.locator("#numeral-hint")).toContainText("Hebrew");
  await expect(page.locator("#results-section")).toBeHidden();
  await expect(page.locator(".value-number")).toHaveText("–");

  // Switching to real Hebrew recovers normally.
  await page.fill("#name-input", "דוד");
  await expect(page.locator(".value-number")).toHaveText("14");
  await expect(page.locator("#results-section")).toBeVisible();
});
