import { getDirectorySize } from "../core/utils/file.mjs";

export default class SizeMetric {
  name = "size";

  /** @type {import('../types').Metric['collect']} */
  async collect({ buildResult }) {
    // Get total directory size
    const totalSize = await getDirectorySize(buildResult.outputPath);

    return {
      value: totalSize,
      displayName: "Size",
      unit: "bytes",
    };
  }
}
