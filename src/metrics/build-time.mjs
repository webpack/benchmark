import { formatDuration } from "../core/utils/formatting.mjs";

export default class BuildTimeMetric {
  name = "Build Time";

  async collect(_, { startTime, endTime }) {
    const buildTime = endTime - startTime;

    return {
      value: buildTime,
      unit: "ms",
      formatted: formatDuration(buildTime),
    };
  }
}
