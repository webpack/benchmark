import { formatBytes } from "../core/utils/formatting.mjs";
import { getDirectorySize } from "../core/utils/file.mjs";

export default class SizeMetric {
  name = "Size";

  /** @type {import('../types').Metric['collect']} */
  async collect({ buildResult }) {
    // Get total directory size
    const totalSize = await getDirectorySize(buildResult.outputPath);

    return {
      value: totalSize,
      unit: "bytes",
      formatted: formatBytes(totalSize),
    };
  }
}
