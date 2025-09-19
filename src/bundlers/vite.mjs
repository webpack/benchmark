import path from "node:path";

import { build as vite } from "vite";

import { removeIfExists } from "../core/utils/file.mjs";

const BUNDLER_NAME = "vite";
const OUTPUT_DIR = "vite-dist";

/** @type {import('../types').Bundler['build']} */
export async function build(fixture) {
  const outputPath = path.join(fixture, OUTPUT_DIR);

  const result = await vite({
    root: fixture,
    build: {
      outDir: outputPath,
      minify: true,
      sourcemap: false,
      rollupOptions: {
        input: path.join(fixture, "main.js"),
      },
    },
  });

  return {
    bundler: BUNDLER_NAME,
    outputPath,
    buildResult: result,
  };
}

/** @type {import('../types').Bundler['clean']} */
export async function clean(fixture) {
  const outputPath = path.join(fixture, OUTPUT_DIR);
  await removeIfExists(outputPath);
}
