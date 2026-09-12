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

test("when framed (e.g. an embedded preview), Export as PDF opens a fresh tab and prints there", async ({ page }) => {
  // Regression test: window.print() is silently blocked inside a sandboxed
  // iframe (like an embedded Artifact preview panel). The app detects
  // window.self !== window.top and opens the same search in a real
  // top-level tab instead, carrying ?q=&print=1 so that tab auto-prints
  // once loaded.
  // Absolute URL: setContent() has no navigation history for a relative
  // src to resolve against.
  await page.setContent('<iframe src="http://localhost:8080/index.html" style="width:1200px;height:900px;"></iframe>');
  const frameElement = await page.waitForSelector("iframe");
  const frame = await frameElement.contentFrame();
  await frame.waitForSelector("#name-input:not([disabled])", { timeout: 30000 });

  const openedUrl = await frame.evaluate(() => {
    let captured = null;
    window.open = (url) => { captured = url; return { closed: false }; };
    document.getElementById("export-pdf").click();
    return captured;
  });

  expect(openedUrl).toContain("print=1");
  expect(openedUrl).toContain("q=");
});
