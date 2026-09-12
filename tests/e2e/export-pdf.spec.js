import { test, expect } from "@playwright/test";

// Two script-driven approaches were tried here and both silently failed
// inside Claude's embedded Artifact preview: a window.open() popup (blocked
// as a popup) and, after that, branching between window.print() and a link
// based on `window.self !== window.top` (that detection itself turned out
// to be unreliable in a sandboxed/cross-origin iframe, so it silently took
// the window.print() branch and did nothing visible). Export as PDF is now
// an unconditional real <a target="_blank"> in every context — no
// detection, no script-driven popup, just the browser's own navigation.

test.beforeEach(async ({ page }) => {
  await page.goto("/index.html");
  await page.waitForSelector("#name-input:not([disabled])", { timeout: 30000 });
});

test("Export as PDF is a real link pointed at the current search", async ({ page }) => {
  const exportEl = page.locator("#export-pdf");
  await expect(exportEl).toHaveJSProperty("tagName", "A");
  await expect(exportEl).toHaveAttribute("target", "_blank");

  await page.fill("#name-input", "יהוה");
  await expect(page.locator(".value-number")).toHaveText("26");

  const href = await exportEl.getAttribute("href");
  expect(href).toContain("print=1");
  expect(href).toContain(encodeURIComponent("יהוה"));
});

test("clicking Export as PDF opens a fresh tab that auto-prints there", async ({ page, context }) => {
  await context.addInitScript(() => {
    window.__printCalled = false;
    window.print = () => { window.__printCalled = true; };
  });

  const [newPage] = await Promise.all([
    context.waitForEvent("page"),
    page.click("#export-pdf"),
  ]);

  expect(newPage.url()).toContain("print=1");
  expect(newPage.url()).toContain("q=");

  await newPage.waitForSelector("#name-input:not([disabled])", { timeout: 30000 });
  await expect.poll(() => newPage.evaluate(() => window.__printCalled), { timeout: 5000 }).toBe(true);
});

test("the export link still works correctly when the app itself is embedded in an iframe", async ({ page }) => {
  // Absolute URL: setContent() has no navigation history for a relative
  // src to resolve against.
  await page.setContent('<iframe src="http://localhost:8080/index.html" style="width:1200px;height:900px;"></iframe>');
  const frameElement = await page.waitForSelector("iframe");
  const frame = await frameElement.contentFrame();
  await frame.waitForSelector("#name-input:not([disabled])", { timeout: 30000 });

  const exportEl = frame.locator("#export-pdf");
  await expect(exportEl).toHaveJSProperty("tagName", "A");
  await expect(exportEl).toHaveAttribute("target", "_blank");
  const href = await exportEl.getAttribute("href");
  expect(href).toContain("print=1");
  expect(href).toContain("q=");
});
