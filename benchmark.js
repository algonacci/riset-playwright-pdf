import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { performance } from "perf_hooks";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = path.join(__dirname, "index.html");
const outputPdf = path.join(__dirname, "benchmark_invoice.pdf");

function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100, // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100, // MB
    external: Math.round(usage.external / 1024 / 1024 * 100) / 100, // MB
  };
}

async function benchmarkApproach(approachName) {
  console.log(`\n🔄 Starting benchmark: ${approachName}`);
  console.log("=".repeat(50));

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

  const midMemory = getMemoryUsage();

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // Load HTML
  const html = fs.readFileSync(htmlPath, "utf8");
  await page.setContent(html, { waitUntil: "load" });

  const beforePdfMemory = getMemoryUsage();

  await page.pdf({
    path: outputPdf,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  });

  const afterPdfMemory = getMemoryUsage();

  await page.close();
  await context.close();
  await browser.close();

  const endTime = performance.now();
  const endMemory = getMemoryUsage();

  const totalTime = Math.round((endTime - startTime) * 100) / 100;

  console.log(`\n📊 Results for ${approachName}:`);
  console.log(`⏱️  Total Time: ${totalTime}ms`);
  console.log(`💾 Memory Usage:`);
  console.log(`   Initial:     RSS: ${startMemory.rss}MB, Heap: ${startMemory.heapUsed}MB`);
  console.log(`   After Browser Launch: RSS: ${midMemory.rss}MB, Heap: ${midMemory.heapUsed}MB`);
  console.log(`   Before PDF:  RSS: ${beforePdfMemory.rss}MB, Heap: ${beforePdfMemory.heapUsed}MB`);
  console.log(`   After PDF:    RSS: ${afterPdfMemory.rss}MB, Heap: ${afterPdfMemory.heapUsed}MB`);
  console.log(`   Final:       RSS: ${endMemory.rss}MB, Heap: ${endMemory.heapUsed}MB`);
  console.log(`   Peak Memory: RSS: ${afterPdfMemory.rss}MB, Heap: ${afterPdfMemory.heapUsed}MB`);

  return {
    approach: approachName,
    time: totalTime,
    initialRSS: startMemory.rss,
    initialHeap: startMemory.heapUsed,
    peakRSS: afterPdfMemory.rss,
    peakHeap: afterPdfMemory.heapUsed,
    finalRSS: endMemory.rss,
    finalHeap: endMemory.heapUsed,
  };
}

async function runBenchmarks() {
  console.log("🚀 Starting Memory & Time Benchmark\n");

  // Run benchmark multiple times for accuracy
  const runs = 3;
  const results = [];

  for (let i = 0; i < runs; i++) {
    console.log(`\n🔁 Run ${i + 1}/${runs}`);
    const result = await benchmarkApproach(`Optimized Render (Run ${i + 1})`);
    results.push(result);

    // Clean up between runs
    if (fs.existsSync(outputPdf)) {
      fs.unlinkSync(outputPdf);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Wait a bit between runs
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Calculate averages
  const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
  const avgPeakRSS = results.reduce((sum, r) => sum + r.peakRSS, 0) / results.length;
  const avgPeakHeap = results.reduce((sum, r) => sum + r.peakHeap, 0) / results.length;

  console.log("\n" + "=".repeat(50));
  console.log("📈 SUMMARY RESULTS");
  console.log("=".repeat(50));
  console.log(`Average Time:     ${Math.round(avgTime * 100) / 100}ms`);
  console.log(`Average Peak RSS: ${Math.round(avgPeakRSS * 100) / 100}MB`);
  console.log(`Average Peak Heap: ${Math.round(avgPeakHeap * 100) / 100}MB`);

  // Save results to file
  const resultsData = {
    timestamp: new Date().toISOString(),
    results: results,
    averages: {
      time: Math.round(avgTime * 100) / 100,
      peakRSS: Math.round(avgPeakRSS * 100) / 100,
      peakHeap: Math.round(avgPeakHeap * 100) / 100,
    }
  };

  fs.writeFileSync(
    path.join(__dirname, "benchmark_results.json"),
    JSON.stringify(resultsData, null, 2)
  );

  console.log("\n💾 Results saved to: benchmark_results.json");
}

runBenchmarks().catch(console.error);
