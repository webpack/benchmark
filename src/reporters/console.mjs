import path from "node:path";

import Table from "cli-table3";
import { consola } from "consola";

import { formatValue } from "../core/utils/formatting.mjs";

/**
 * Prints a summary table
 * @param {Map<string, Map<string, import('../types').MetricResult>>} bundlerResults
 * @param {Array<string>} bundlers
 */
function printSummaryTable(bundlerResults, bundlers) {
  const headers = new Set();

  const rows = bundlers.map((bundler) => ({
    [bundler]: [...bundlerResults.get(bundler).values()].map((result) => {
      headers.add(result.displayName);
      return formatValue(result.value, result.unit);
    }),
  }));

  const table = new Table({
    head: ["Bundler", ...headers],
    style: { head: ["cyan"], border: ["grey"] },
  });

  table.push(...rows);

  console.log(table.toString());
}

/** @type {import('../types').Reporter} */
export default function (results) {
  consola.info("Benchmark Results");
  console.log("=".repeat(60));

  for (const [fixturePath, bundlerResults] of results) {
    const fixtureName = path.basename(fixturePath);
    consola.info(`Fixture: ${fixtureName}`);

    const bundlers = Array.from(bundlerResults.keys());
    printSummaryTable(bundlerResults, bundlers);
  }
}
