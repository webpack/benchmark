import measure from "../lib/measure.js";
import { formatResultTable } from "../lib/utils.js";

const [
	,
	,
	caseName = "minimal",
	scenarioName = "development-default-build",
] = process.argv;

(async () => {
	const result = await measure(caseName, scenarioName, {
		runs: 30,
		verboseSetup: true,
	});
	console.log(formatResultTable(result, { colors: true, verbose: true }));
})().catch((err) => console.error(err.stack));
