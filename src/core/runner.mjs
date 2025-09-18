import { performance } from "node:perf_hooks";
import { glob } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { consola } from "consola";

const cache = new Map();

export async function load(module, instantiate = false) {
  let mod = cache.get(module);

  if (!mod) {
    mod = await import(import.meta.resolve(module));
    cache.set(module, mod);
  }

  return instantiate ? new mod.default() : (mod.default ?? mod);
}

export class BenchmarkRunner {
  constructor(options) {
    this.bundlers = options.bundlers;
    this.metrics = options.metrics;
    this.reporter = options.reporter;
    this.fixturesGlob = options.fixtures;
  }

  // This is the new entry point
  async run() {
    consola.info(
      `Benchmarking ${this.bundlers.join(", ")} with metrics: ${this.metrics.join(", ")} on fixtures: ${this.fixturesGlob}`,
    );

    // Resolve all fixtures from glob
    const cwd = process.cwd();
    const fixturePaths = (await Array.fromAsync(glob(this.fixturesGlob))).map(
      (fixturePath) =>
        isAbsolute(fixturePath) ? fixturePath : join(cwd, fixturePath),
    );

    // Load reporter
    const report = await load(`../reporters/${this.reporter}.mjs`);

    // results will be: Map<fixture, Map<bundler, metrics>>
    const allResults = new Map();

    // Run for each fixture
    for (const fixture of fixturePaths) {
      consola.info(`Running benchmarks for fixture: ${fixture}`);

      const fixtureResults = await this.runForFixture(fixture);
      allResults.set(fixture, fixtureResults);
    }

    await report(allResults);

    return allResults;
  }

  async runForFixture(fixture) {
    const results = new Map();
    for (const bundler of this.bundlers) {
      results.set(bundler, {});
    }

    for (const bundlerName of this.bundlers) {
      const bundler = await load(`../bundlers/${bundlerName}.mjs`);

      const metrics = await Promise.all(
        this.metrics.map((metric) => load(`../metrics/${metric}.mjs`, true)),
      );

      results.set(
        bundlerName,
        await this.runSingleBenchmark(bundler, metrics, fixture),
      );
    }

    return results;
  }

  async runSingleBenchmark(bundler, metrics, fixture) {
    await bundler.clean(fixture);

    await Promise.all(metrics.map((metric) => metric.start?.()));

    const startTime = performance.now();
    const buildResult = await bundler.build(fixture);
    const endTime = performance.now();

    await Promise.all(metrics.map((metric) => metric.stop?.()));

    return new Map(
      await Promise.all(
        metrics.map(async (m) => [
          m.name,
          await m.collect(buildResult, {
            startTime,
            endTime,
            fixture,
          }),
        ]),
      ),
    );
  }
}
