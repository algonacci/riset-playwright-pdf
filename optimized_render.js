import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = path.join(__dirname, "index.html");
const outputPdf = path.join(__dirname, "invoice.pdf");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-gpu",
      "--disable-extensions",
      "--disable-dev-shm-usage",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-sync",
      "--disable-notifications",
      "--no-sandbox",
      "--no-zygote",
      "--single-process",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // Load HTML langsung (lebih irit daripada file://)
  const html = fs.readFileSync(htmlPath, "utf8");
  await page.setContent(html, { waitUntil: "load" });

  await page.pdf({
    path: outputPdf,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  });

  await page.close();
  await context.close();
  await browser.close();

  console.log("✅ PDF generated (low RAM mode):", outputPdf);
})();
