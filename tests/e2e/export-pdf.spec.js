import { test, expect } from "@playwright/test";

test("clicking Export as PDF calls window.print() directly on a top-level page", async ({ page }) => {
  await page.goto("/index.html");
  await page.waitForSelector("#name-input:not([disabled])", { timeout: 30000 });

  await page.evaluate(() => {
    window.__printCalled = false;
    window.print = () => { window.__printCalled = true; };
  });
  await page.click("#export-pdf");
  await expect.poll(() => page.evaluate(() => window.__printCalled)).toBe(true);
});

test("when framed (e.g. an embedded preview), Export as PDF is a real link instead of a script popup", async ({ page }) => {
  // Regression test, round 2: window.print() is blocked inside a sandboxed
  // iframe (an embedded Artifact preview panel), and the first fix for that
  // — a script-driven window.open() popup — turned out to be blocked too
  // (browsers treat popups from a nested/cross-origin frame far more
  // strictly than an ordinary navigation). The app now swaps the button for
  // a genuine <a target="_blank"> when framed, so the click is a normal
  // top-level navigation, not a popup, carrying ?q=&print=1 so that tab
  // auto-prints once loaded.
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
