import { build as esbuild } from "esbuild";
import path from "node:path";
import { removeIfExists } from "../core/utils/file.mjs";

const BUNDLER_NAME = "esbuild";
const OUTPUT_DIR = "esbuild-dist";

/** @type {import('../types').Bundler['build']} */
export async function build(fixture) {
  const outputPath = path.join(fixture, OUTPUT_DIR);

  const result = await esbuild({
    bundle: true,
    minify: true,
    outdir: outputPath,
    entryPoints: [path.join(fixture, "main.js")],
    sourceRoot: fixture,
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
