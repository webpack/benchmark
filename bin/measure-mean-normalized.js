import measure from "../lib/measure.js";
import { formatResultTable, normalizeResult } from "../lib/utils.js";
import { mkdir, writeFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const [
	,
	,
	caseName = "minimal",
	scenarioName = "development-default-build",
	date = undefined,
	normalDate = "2021-02-15",
] = process.argv;

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");

(async () => {
	const normalResult1 = await measure(caseName, scenarioName, {
		run: 15,
		verboseSetup: true,
		date: normalDate,
	});
	const baseResult = await measure(caseName, scenarioName, {
		runs: 30,
		verboseSetup: true,
		date,
	});
	const normalResult2 = await measure(caseName, scenarioName, {
		run: 15,
		verboseSetup: true,
		date: normalDate,
	});
	const result = normalizeResult(
		baseResult,
		(normalResult1.stats.median + normalResult2.stats.median) / 2
	);
	console.log(formatResultTable(result, { colors: true, verbose: true }));
	await mkdir(resolve(rootDir, "output"), { recursive: true });
	await writeFile(
		resolve(rootDir, `output/${caseName}_${scenarioName}.json`),
		JSON.stringify(result, null, 2)
	);
})().catch((err) => {
	process.exitCode = 1;
	console.error(err.stack);
});
