import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { performance } from "perf_hooks";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = path.join(__dirname, "index.html");

function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
  };
}

async function optimizedApproach() {
  const outputPdf = path.join(__dirname, "optimized_test.pdf");

  const startTime = performance.now();
  const startMemory = getMemoryUsage();

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

  const html = fs.readFileSync(htmlPath, "utf8");
  await page.setContent(html, { waitUntil: "load" });

  await page.pdf({
    path: outputPdf,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  });

  const peakMemory = getMemoryUsage();

  await page.close();
  await context.close();
  await browser.close();

  const endTime = performance.now();
  const endMemory = getMemoryUsage();

  if (fs.existsSync(outputPdf)) {
    fs.unlinkSync(outputPdf);
  }

  return {
    name: "Optimized (setContent + optimizations)",
    time: Math.round((endTime - startTime) * 100) / 100,
    initialRSS: startMemory.rss,
    initialHeap: startMemory.heapUsed,
    peakRSS: peakMemory.rss,
    peakHeap: peakMemory.heapUsed,
    finalRSS: endMemory.rss,
    finalHeap: endMemory.heapUsed,
  };
}

async function standardApproach() {
  const outputPdf = path.join(__dirname, "standard_test.pdf");

  const startTime = performance.now();
  const startMemory = getMemoryUsage();

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`file://${htmlPath}`);

  await page.pdf({
    path: outputPdf,
    format: "A4",
    printBackground: true,
  });

  const peakMemory = getMemoryUsage();

  await page.close();
  await context.close();
  await browser.close();

  const endTime = performance.now();
  const endMemory = getMemoryUsage();

  if (fs.existsSync(outputPdf)) {
    fs.unlinkSync(outputPdf);
  }

  return {
    name: "Standard (file:// + defaults)",
    time: Math.round((endTime - startTime) * 100) / 100,
    initialRSS: startMemory.rss,
    initialHeap: startMemory.heapUsed,
    peakRSS: peakMemory.rss,
    peakHeap: peakMemory.heapUsed,
    finalRSS: endMemory.rss,
    finalHeap: endMemory.heapUsed,
  };
}

function printComparison(results) {
  console.log("\n" + "=".repeat(70));
  console.log("📊 MEMORY & TIME COMPARISON RESULTS");
  console.log("=".repeat(70));

  const optimized = results[0];
  const standard = results[1];

  console.log(`\n${optimized.name}:`);
  console.log(`  ⏱️  Time:        ${optimized.time}ms`);
  console.log(`  💾 Peak RSS:    ${optimized.peakRSS}MB`);
  console.log(`  💾 Peak Heap:  ${optimized.peakHeap}MB`);

  console.log(`\n${standard.name}:`);
  console.log(`  ⏱️  Time:        ${standard.time}ms`);
  console.log(`  💾 Peak RSS:    ${standard.peakRSS}MB`);
  console.log(`  💾 Peak Heap:   ${standard.peakHeap}MB`);

  console.log(`\n📈 Performance Difference:`);
  const timeDiff = standard.time - optimized.time;
  const timePercent = (timeDiff / standard.time * 100).toFixed(1);
  const rssDiff = standard.peakRSS - optimized.peakRSS;
  const heapDiff = standard.peakHeap - optimized.peakHeap;

  console.log(`  Time:    ${timeDiff > 0 ? '+' : ''}${timeDiff}ms (${timePercent}% ${timeDiff > 0 ? 'faster' : 'slower'})`);
  console.log(`  Memory:  ${rssDiff > 0 ? '+' : ''}${rssDiff}MB RSS, ${heapDiff > 0 ? '+' : ''}${heapDiff}MB Heap`);

  console.log("\n" + "=".repeat(70));

  // Save to file
  const comparisonData = {
    timestamp: new Date().toISOString(),
    optimized,
    standard,
    difference: {
      time: timeDiff,
      timePercent: parseFloat(timePercent),
      rssDiff,
      heapDiff,
    }
  };

  fs.writeFileSync(
    path.join(__dirname, "comparison_results.json"),
    JSON.stringify(comparisonData, null, 2)
  );

  console.log("💾 Comparison saved to: comparison_results.json\n");
}

async function runComparison() {
  console.log("🔄 Running comparison between Optimized vs Standard approach...\n");

  // Run both approaches
  const optimized = await optimizedApproach();

  // Wait between runs
  await new Promise(resolve => setTimeout(resolve, 1000));

  const standard = await standardApproach();

  // Force GC
  if (global.gc) {
    global.gc();
  }

  printComparison([optimized, standard]);
}

runComparison().catch(console.error);
