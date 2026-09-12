import { test, expect } from "@playwright/test";

// "Export as PDF" went through three script-driven approaches — a
// window.open() popup, then an unconditional <a target="_blank"> link —
// and all three were silently blocked (or, worse, silently no-op) inside
// Claude's embedded Artifact preview with no reliable client-side way found
// to detect or work around it. Clipboard copy needs neither a print dialog
// nor a new browsing context, so "Copy as Markdown" replaces it entirely.

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/index.html");
  await page.waitForSelector("#name-input:not([disabled])", { timeout: 30000 });
});

test("Copy as Markdown puts a structured report of the active tab on the clipboard", async ({ page }) => {
  await page.fill("#name-input", "יאשיהו");
  await expect(page.locator(".value-number")).toHaveText("332");

  const btn = page.locator("#copy-markdown");
  await btn.click();
  await expect(btn).toHaveText("Copied!");

  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toContain("# יאשיהו — Standard Value: 332");
  expect(clipboardText).toContain("## Tanakh Words (41)");
  expect(clipboardText).toMatch(/^### /m); // at least one result heading
  expect(clipboardText).toContain("JPS 1917:");
});

test("Copy as Markdown follows the active tab and corpus", async ({ page }) => {
  await page.fill("#name-input", "יאשיהו דוד עזריאל לישאביץ");
  await expect(page.locator(".value-number")).toHaveText("1107");
  await page.click('.tab:has-text("Passages")');

  await page.locator("#copy-markdown").click();
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toContain("## Tanakh Passages");

  await page.click('.corpus-tab:has-text("Mishnah")');
  await page.click('.tab:has-text("Phrases")');
  await page.locator("#copy-markdown").click();
  const mishnahClipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(mishnahClipboard).toContain("## Mishnah Phrases");
});

test("Copy Link puts a ?q= link on the clipboard without ever touching the address bar on its own", async ({
  page,
}) => {
  // An earlier version synced ?q= into the address bar automatically on
  // every keystroke via history.replaceState. That silently broke "Add to
  // Home Screen": iOS captures whatever URL is showing at the moment the
  // icon is added, so a home-screen launch could reopen to a half-typed
  // search instead of the app's real default. Copy Link is opt-in instead.
  await page.fill("#name-input", "חיים");
  await expect(page.locator(".value-number")).toHaveText("68");
  await expect(page).not.toHaveURL(/[?&]q=/);

  const btn = page.locator("#copy-link");
  await btn.click();
  await expect(btn).toHaveText("Copied!");
  await expect(page).not.toHaveURL(/[?&]q=/);

  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain(`?q=${encodeURIComponent("חיים")}`);
});
