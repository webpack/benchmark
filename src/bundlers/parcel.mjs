import path from "node:path";

import { Parcel } from "@parcel/core";

import { removeIfExists } from "../core/utils/file.mjs";

const BUNDLER_NAME = "parcel";
const OUTPUT_DIR = "parcel-dist";

/** @type {import('../types').Bundler['build']} */
export async function build(fixture) {
  const outputPath = path.join(fixture, OUTPUT_DIR);

  const bundler = new Parcel({
    entries: [path.join(fixture, "main.js")],
    defaultConfig: "@parcel/config-default",
    targets: {
      default: {
        distDir: outputPath,
        sourceMap: false,
      },
    },
    mode: "production",
  });

  const { bundleGraph } = await bundler.run();

  return {
    bundler: BUNDLER_NAME,
    outputPath,
    buildResult: bundleGraph,
  };
}

/** @type {import('../types').Bundler['clean']} */
export async function clean(fixture) {
  const outputPath = path.join(fixture, OUTPUT_DIR);
  await removeIfExists(outputPath);
  await removeIfExists(".parcel-cache");
}
