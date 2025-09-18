import Table from "cli-table3";
import { consola } from "consola";
import path from "path";

function extractMetrics(bundlerResults) {
  const metrics = new Set();
  for (const [, bundlerMetrics] of bundlerResults) {
    for (const metricName of bundlerMetrics.keys()) {
      metrics.add(metricName);
    }
  }
  return Array.from(metrics).sort();
}

function formatValue(metricData) {
  if (!metricData) return "─";
  return metricData.formatted || String(metricData.value) || "─";
}

function createBundlerRow(bundler, bundlerMetrics, metricsList) {
  const row = [bundler];

  for (const metric of metricsList) {
    const metricData = bundlerMetrics.get(metric);
    row.push(formatValue(metricData));
  }

  return row;
}

function printSummaryTable(bundlerResults, bundlers) {
  const metricsList = extractMetrics(bundlerResults);

  const table = new Table({
    head: ["Bundler", ...metricsList],
    colWidths: [15, ...Array(metricsList.length).fill(18)],
    style: { head: ["cyan"], border: ["grey"] },
  });

  for (const bundler of bundlers) {
    const bundlerMetrics = bundlerResults.get(bundler);
    table.push(createBundlerRow(bundler, bundlerMetrics, metricsList));
  }

  console.log(table.toString());
}

export default function displayResults(results) {
  consola.info("Benchmark Results");
  console.log("=".repeat(60));

  for (const [fixturePath, bundlerResults] of results) {
    const fixtureName = path.basename(fixturePath);
    consola.info(`Fixture: ${fixtureName}`);

    const bundlers = Array.from(bundlerResults.keys());
    printSummaryTable(bundlerResults, bundlers);
  }
}
