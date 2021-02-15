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
] = process.argv;

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");

(async () => {
	const { diff, result } = await compare(caseName, scenarioName, {
		runs: 30,
		cache: false,
		verboseSetup: true,
	});
	console.log(formatResultTable(result, { colors: true, verbose: true }));
	console.log();
	console.log(formatDiffTable(diff, { colors: true, verbose: true }));
	process.exitCode = diff.stats.lowHigh < 1 || diff.stats.highLow > 1;
})().catch((err) => {
	process.exitCode = 1;
	console.error(err.stack);
});
