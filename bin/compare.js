import compare from "../lib/compare.js";
import { formatDiffTable } from "../lib/utils.js";
import { mkdir, writeFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const [
	,
	,
	caseName = "minimal",
	scenarioName = "development-default-build",
	baseline = "v5.0.0",
	current = "master",
] = process.argv;

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");

(async () => {
	const diff = await compare(caseName, scenarioName, {
		runs: 30,
		verboseSetup: true,
		baselineDependencies: {
			webpack: `webpack/webpack#${baseline}`,
		},
		dependencies: {
			webpack: `webpack/webpack#${current}`,
		},
	});
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
