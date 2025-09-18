import { build as vite } from "vite";
import path from "node:path";
import { removeIfExists } from "../core/utils/file.mjs";

const BUNDLER_NAME = "vite";
const OUTPUT_DIR = "vite-dist";

export async function build(fixture) {
  const outputPath = path.join(fixture, OUTPUT_DIR);
  const config = createViteConfig(fixture, outputPath);
  const result = await vite(config);

  return {
    bundler: BUNDLER_NAME,
    outputPath,
    success: true,
    buildResult: result,
  };
}

export async function clean(fixture) {
  const outputPath = path.join(fixture, OUTPUT_DIR);
  await removeIfExists(outputPath);
}

export function createViteConfig(fixture, outDir) {
  return {
    root: fixture,
    build: {
      outDir,
      minify: true,
      sourcemap: false,
      rollupOptions: {
        input: path.join(fixture, "main.js"),
      },
    },
    logLevel: "error",
  };
}
