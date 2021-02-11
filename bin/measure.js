import measure from "../lib/measure.js";

const [
	,
	,
	caseName = "minimal",
	scenarioName = "development-default-build",
] = process.argv;

(async () => {
	console.log(
		await measure(caseName, scenarioName, {
			verbose: true,
			verboseSetup: true,
			noStatistics: true,
		})
	);
})().catch((err) => console.error(err.stack));
