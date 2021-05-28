import { parseDependencies } from "../lib/utils.js";
import measure from "../lib/measure.js";

const [
	,
	,
	caseName = "minimal",
	scenarioName = "development-default-build",
	current = "",
] = process.argv;

const isDate = (str) => str.startsWith("20");

(async () => {
	console.log(
		await measure(caseName, scenarioName, {
			verbose: true,
			verboseSetup: true,
			noStatistics: true,
			dependencies: isDate(current) ? undefined : parseDependencies(current),
			date: isDate(current) ? current : undefined,
		})
	);
})().catch((err) => {
	process.exitCode = 1;
	console.error(err.stack);
});
