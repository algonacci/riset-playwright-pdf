import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = path.join(__dirname, "index.html");
const outputPdf = path.join(__dirname, "invoice.pdf");

(async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Load local HTML file
  await page.goto(`file://${htmlPath}`, {
    waitUntil: "networkidle",
  });

  // Generate PDF
  await page.pdf({
    path: outputPdf,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  });

  await browser.close();

  console.log("✅ PDF generated:", outputPdf);
})();
