import path from "node:path";

import webpack from "webpack";

import { removeIfExists } from "../core/utils/file.mjs";

const BUNDLER_NAME = "webpack";
const OUTPUT_DIR = "webpack-dist";

/** @type {import('../types').Bundler['build']} */
export async function build(fixture) {
  const outputPath = path.join(fixture, OUTPUT_DIR);

  const result = await runWebpack({
    mode: "production",
    entry: path.join(fixture, "main.js"),
    output: {
      path: outputPath,
    },
    optimization: {
      minimize: true,
    },
  });

  return {
    bundler: BUNDLER_NAME,
    outputPath,
    buildResult: result,
  };
}

/**
 * Runs a promisified webpack
 * @param {import('webpack').Configuration} config The Webpack Config
 * @returns {import('webpack').Stats}
 */
function runWebpack(config) {
  return new Promise((resolve, reject) => {
    webpack(config, (err, stats) => {
      if (err) {
        reject(err);
        return;
      }
      if (stats.hasErrors()) {
        const errors = stats.toJson().errors;
        reject(
          new Error(
            `Webpack compilation errors: ${errors.map((e) => e.message).join(", ")}`,
          ),
        );
        return;
      }
      resolve(stats);
    });
  });
}

/** @type {import('../types').Bundler['clean']} */
export async function clean(fixture) {
  const outputPath = path.join(fixture, OUTPUT_DIR);
  await removeIfExists(outputPath);
}
