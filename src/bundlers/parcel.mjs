import { Parcel } from "@parcel/core";
import path from "node:path";
import { removeIfExists } from "../core/utils/file.mjs";

const BUNDLER_NAME = "parcel";
const OUTPUT_DIR = "parcel-dist";

export async function build(fixture) {
  const outputPath = path.join(fixture, OUTPUT_DIR);
  const config = createParcelConfig(fixture, outputPath);

  const bundler = new Parcel({
    entries: config.entries,
    defaultConfig: "@parcel/config-default",
    targets: config.targets,
    logLevel: "error",
  });

  const { bundleGraph } = await bundler.run();

  return {
    bundler: BUNDLER_NAME,
    outputPath,
    success: true,
    buildResult: bundleGraph,
  };
}

export async function clean(fixture) {
  const outputPath = path.join(fixture, OUTPUT_DIR);
  await removeIfExists(outputPath);
  await removeIfExists(".parcel-cache");
}

export function createParcelConfig(fixture, distDir) {
  return {
    entries: [path.join(fixture, "main.js")],
    targets: {
      default: {
        distDir,
        optimize: true,
        scopeHoist: true,
        sourceMap: false,
      },
    },
  };
}
