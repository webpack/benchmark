export default class BuildTimeMetric {
  name = "build-time";
  /** @type {import('../types').Metric['collect']} */
  async collect({ startTime, endTime }) {
    const buildTime = endTime - startTime;

    return {
      value: buildTime,
      displayName: "Build Time",
      unit: "ms",
    };
  }
}
