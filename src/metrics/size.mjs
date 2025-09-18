import { formatBytes } from "../core/utils/formatting.mjs";
import { getDirectorySize } from "../core/utils/file.mjs";

export default class SizeMetric {
  name = "Size";

  async collect({ outputPath }) {
    // Get total directory size
    const totalSize = await getDirectorySize(outputPath);

    return {
      value: totalSize,
      unit: "bytes",
      formatted: formatBytes(totalSize),
    };
  }
}
