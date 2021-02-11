import compare from "../lib/compare.js";
import { formatDiffTable } from "../lib/utils.js";

const [
	,
	,
	caseName = "minimal",
	scenarioName = "development-default-build",
	baseline = "v5.0.0",
	current = "master",
] = process.argv;

(async () => {
	const diff = await compare(caseName, scenarioName, {
		runs: 20,
		verboseSetup: true,
		baselineDependencies: {
			webpack: `webpack/webpack#${baseline}`,
		},
		dependencies: {
			webpack: `webpack/webpack#${current}`,
		},
	});
	console.log(formatDiffTable(diff));
})().catch((err) => console.error(err.stack));
