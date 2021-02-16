import measure from "../lib/measure.js";
import { formatResultTable } from "../lib/utils.js";
import { mkdir, writeFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const [
	,
	,
	caseName = "minimal",
	scenarioName = "development-default-build",
	date = undefined,
] = process.argv;

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");

(async () => {
	const result = await measure(caseName, scenarioName, {
		runs: 30,
		verboseSetup: true,
		date,
	});
	console.log(formatResultTable(result, { colors: true, verbose: true }));
	await mkdir(resolve(rootDir, "output"), { recursive: true });
	await writeFile(
		resolve(rootDir, `output/${caseName}_${scenarioName}.json`),
		JSON.stringify(diff, null, 2)
	);
})().catch((err) => {
	process.exitCode = 1;
	console.error(err.stack);
});
