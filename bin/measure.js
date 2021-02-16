import measure from "../lib/measure.js";

const [
	,
	,
	caseName = "minimal",
	scenarioName = "development-default-build",
	date = undefined,
] = process.argv;

(async () => {
	console.log(
		await measure(caseName, scenarioName, {
			verbose: true,
			verboseSetup: true,
			noStatistics: true,
			date,
		})
	);
})().catch((err) => {
	process.exitCode = 1;
	console.error(err.stack);
});
