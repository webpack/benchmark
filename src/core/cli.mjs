#!/usr/bin/env node

import { Command } from "commander";
import { consola } from "consola";

import runBenchmark from "./runner.mjs";

new Command()
  .option("-b, --bundlers <bundlers...>", "Select bundlers to benchmark", [
    "vite",
    "webpack",
    "esbuild",
  ])
  .option("-m, --metrics <metrics...>", "Choose metrics to collect", [
    "build-time",
    "size",
  ])
  .option("-r, --reporter <type>", "Choose output format", "console")
  .option(
    "-o, --output <file>",
    "The output file for JSON reports",
    "output.json",
  )
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
    await runBenchmark(options);
    consola.success("Benchmarking completed successfully!");
  })
  .parse();
