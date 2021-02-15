import compare from "../lib/compare.js";
import {
	formatDiffTable,
	formatResultTable,
	parseDependencies,
} from "../lib/utils.js";
import { mkdir, writeFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const [
	,
	,
	caseName = "minimal",
	scenarioName = "development-build",
	baseline = "webpack@webpack/webpack#v5.22.0",
	current = "webpack@webpack/webpack#v5.22.0",
] = process.argv;

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");

(async () => {
	const { diff, result } = await compare(caseName, scenarioName, {
		runs: 30,
		verboseSetup: true,
		baselineDependencies: parseDependencies(baseline),
		dependencies: parseDependencies(current),
	});
	console.log(formatResultTable(result, { colors: true, verbose: true }));
	console.log();
	console.log(formatDiffTable(diff, { colors: true, verbose: true }));
	await mkdir(resolve(rootDir, "output"), { recursive: true });
	await writeFile(
		resolve(rootDir, `output/${caseName}_${scenarioName}.json`),
		JSON.stringify(diff, null, 2)
	);
})().catch((err) => {
	process.exitCode = 1;
	console.error(err.stack);
});
