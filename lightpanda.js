"use strict";

import { chromium } from "playwright-core";

console.time("Execution Time Lightpanda.io");

(async () => {
  try {
    // Connect ke Lightpanda via CDP
    const browser = await chromium.connectOverCDP("ws://100.110.43.37:9222", {
      timeout: 10_000,
    });

    // Playwright style: buat context baru
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("https://megalogic.id", {
      waitUntil: "networkidle",
    });

    console.log("Halaman berhasil dibuka!");

    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("a")).map(
        (link) => link.href,
      );
    });

    console.log("Daftar Link:", links);

    await page.close();
    await context.close();

    console.log("Context dan halaman telah ditutup.");
  } catch (error) {
    console.error("Terjadi kesalahan:", error);
  } finally {
    console.timeEnd("Execution Time Lightpanda.io");
    process.exit(0);
  }
})();
