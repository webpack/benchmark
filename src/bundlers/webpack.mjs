import webpack from "webpack";
import path from "node:path";
import { removeIfExists } from "../core/utils/file.mjs";

const BUNDLER_NAME = "webpack";
const OUTPUT_DIR = "webpack-dist";

export async function build(fixture) {
  const outputPath = path.join(fixture, OUTPUT_DIR);
  const config = createWebpackConfig(fixture, outputPath);
  const result = await runWebpack(config);

  return {
    bundler: BUNDLER_NAME,
    outputPath,
    success: true,
    buildResult: result,
  };
}

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

export async function clean(fixture) {
  const outputPath = path.join(fixture, OUTPUT_DIR);
  await removeIfExists(outputPath);
}

export function createWebpackConfig(fixture, outputPath) {
  return {
    mode: "production",
    entry: path.join(fixture, "main.js"),
    output: {
      path: outputPath,
    },
    optimization: {
      minimize: true,
    },
    stats: "errors-only", // Reduce noise during benchmarking
  };
}
