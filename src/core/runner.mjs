import { glob } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { performance } from "node:perf_hooks";

import { consola } from "consola";

import { prepareFixture, loadModule } from "./utils/misc.mjs";

/**
 * Runs a benchmark on a fixture
 * @param {string} fixture
 * @param {import('../types').Options} options
 */
async function runForFixture(fixture, options) {
  const results = new Map();
  for (const bundler of options.bundlers) {
    results.set(bundler, {});
  }

  await prepareFixture(fixture);

  for (const bundlerName of options.bundlers) {
    const bundler = await loadModule(`bundlers/${bundlerName}.mjs`);

    const metrics = await Promise.all(
      options.metrics.map((metric) =>
        loadModule(`metrics/${metric}.mjs`, true),
      ),
    );

    results.set(
      bundlerName,
      await runSingleBenchmark(bundler, metrics, fixture, options),
    );
  }

  return results;
}

/**
 * Runs a single benchmark
 * @param {import('../types').Bundler} bundler
 * @param {Array<import('../types').Metric>} metrics
 * @param {string} fixture
 * @param {import('../types').Options} options
 */
async function runSingleBenchmark(bundler, metrics, fixture, options) {
  await bundler.clean(fixture);

  await Promise.all(metrics.map((metric) => metric.start?.(fixture, options)));

  const startTime = performance.now();
  const buildResult = await bundler.build(fixture, options);
  const endTime = performance.now();

  await Promise.all(metrics.map((metric) => metric.stop?.(fixture, options)));

  return new Map(
    await Promise.all(
      metrics.map(async (m) => [
        m.name,
        await m.collect({
          buildResult,
          startTime,
          endTime,
          fixture,
          options,
        }),
      ]),
    ),
  );
}

/**
 * Runs a benchmark
 * @param {import('../types').Options} options
 */
export default async function runBenchmark(options) {
  consola.info(
    `Benchmarking ${options.bundlers.join(", ")} with metrics: ${options.metrics.join(", ")} on fixtures: ${options.fixtures}`,
  );

  // Resolve all fixtures from glob
  const cwd = process.cwd();
  const fixturePaths = (await Array.fromAsync(glob(options.fixtures))).map(
    (fixturePath) =>
      isAbsolute(fixturePath) ? fixturePath : join(cwd, fixturePath),
  );

  // Load reporter
  /** @type {import('../types').Reporter} */
  const report = await loadModule(`reporters/${options.reporter}.mjs`);

  // results will be: Map<fixture, Map<bundler, metrics>>
  const allResults = new Map();

  // Run for each fixture
  for (const fixture of fixturePaths) {
    consola.info(`Running benchmarks for fixture: ${fixture}`);

    const fixtureResults = await runForFixture(fixture, options);
    allResults.set(fixture, fixtureResults);
  }

  await report(allResults, options);

  return allResults;
}
