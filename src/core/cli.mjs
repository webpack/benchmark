#!/usr/bin/env node

import { Command } from "commander";
import { BenchmarkRunner } from "./runner.mjs";
import { consola } from "consola";

new Command()
  .option("-b, --bundlers <bundlers...>", "Select bundlers to benchmark", [
    "vite",
    "webpack",
  ])
  .option("-m, --metrics <metrics...>", "Choose metrics to collect", [
    "build-time",
    "size",
  ])
  .option("-r, --reporter <type>", "Choose output format", "console")
  .option("--fixtures <glob>", "Glob to fixtures", "./fixtures/*")
  .option("--verbose", "Enable verbose logging")
  .option("--silent", "Suppress all output except errors")
  .action(async (options) => {
    // Logger
    if (options.silent) {
      consola.level = -999;
    } else if (options.verbose) {
      consola.level = 999;
    }

    consola.start("Starting bundler benchmarks...");
    const runner = new BenchmarkRunner(options);
    await runner.run();

    consola.success("Benchmarking completed successfully!");
  })
  .parse();
