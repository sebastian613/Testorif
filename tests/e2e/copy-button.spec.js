import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/index.html");
  await page.waitForSelector("#name-input:not([disabled])", { timeout: 30000 });
});

test("copying a word result puts its value and citation on the clipboard", async ({ page }) => {
  await page.fill("#name-input", "יאשיהו");
  await expect(page.locator(".value-number")).toHaveText("332");

  const copyBtn = page.locator("#results-list li").first().locator(".copy-btn");
  await copyBtn.click();
  await expect(copyBtn).toHaveText("Copied!");

  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toContain("Standard Value 332");
  expect(clipboardText).toContain("JPS 1917:");
});

test("copying a passage result puts its citation and translation on the clipboard", async ({ page }) => {
  // 1107 (יאשיהו דוד עזריאל לישאביץ) is known to have whole-passage matches;
  // a single word like יהוה never will, since a passage's total is a sum
  // across every one of its words and 26 is far too small.
  await page.fill("#name-input", "יאשיהו דוד עזריאל לישאביץ");
  await expect(page.locator(".value-number")).toHaveText("1107"); // wait out the input debounce
  await page.click('.tab:has-text("Passages")');

  const copyBtn = page.locator("#results-list li").first().locator(".copy-btn");
  await copyBtn.click();
  await expect(copyBtn).toHaveText("Copied!");

  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toMatch(/\d/); // contains a chapter:verse citation
  expect(clipboardText).toContain("JPS 1917:");
});

test("copying a Mishnah word result cites Joshua Kulp, not JPS 1917", async ({ page }) => {
  await page.fill("#name-input", "501");
  await page.click('.corpus-tab:has-text("Mishnah")');
  await page.waitForTimeout(300);

  const copyBtn = page.locator("#results-list li").first().locator(".copy-btn");
  await copyBtn.click();
  await expect(copyBtn).toHaveText("Copied!");

  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toContain("Joshua Kulp:");
  expect(clipboardText).not.toContain("JPS 1917");
});
