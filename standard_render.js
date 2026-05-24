import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = path.join(__dirname, "index.html");
const outputPdf = path.join(__dirname, "standard_invoice.pdf");

(async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Load HTML via file:// protocol (less efficient)
  await page.goto(`file://${htmlPath}`);

  await page.pdf({
    path: outputPdf,
    format: "A4",
    printBackground: true,
  });

  await page.close();
  await context.close();
  await browser.close();

  console.log("✅ Standard PDF generated:", outputPdf);
})();
