import compare from "../lib/compare.js";
import { formatDiffTable, formatResultTable } from "../lib/utils.js";
import { mkdir, writeFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const [
	,
	,
	caseName = "minimal",
	baseline = "development-build",
	scenarioName = "development-build+persistent-cache",
] = process.argv;

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");

(async () => {
	const { diff, result } = await compare(caseName, scenarioName, {
		runs: 30,
		verboseSetup: true,
		baselineScenario: baseline,
	});
	console.log(formatResultTable(result, { colors: true, verbose: true }));
	console.log();
	console.log(formatDiffTable(diff, { colors: true, verbose: true }));
	await mkdir(resolve(rootDir, "output"), { recursive: true });
	await writeFile(
		resolve(rootDir, `output/${caseName}.json`),
		JSON.stringify(diff, null, 2)
	);
})().catch((err) => {
	process.exitCode = 1;
	console.error(err.stack);
});
