import { formatDuration } from "../core/utils/formatting.mjs";

export default class BuildTimeMetric {
  name = "Build Time";

  /** @type {import('../types').Metric['collect']} */
  async collect({ startTime, endTime }) {
    const buildTime = endTime - startTime;

    return {
      value: buildTime,
      unit: "ms",
      formatted: formatDuration(buildTime),
    };
  }
}
