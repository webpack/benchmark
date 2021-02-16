import { readFile, writeFile, mkdir } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";
import measure from "./measure.js";
import { compareStatistics } from "./utils.js";

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");

const getResult = async (caseName, scenarioName, options) => {
	const cacheIdentifier = `${caseName}-${scenarioName}-${
		options.dependencies
			? Buffer.from(JSON.stringify(options.dependencies)).toString("hex")
			: ""
	}.json`;
	if (process.env.CACHE_COMPARE_MEASURE) {
		try {
			return JSON.parse(
				await readFile(resolve(rootDir, ".cache", cacheIdentifier), "utf-8")
			);
		} catch {}
	}
	const result = await measure(caseName, scenarioName, options);
	await mkdir(resolve(rootDir, ".cache"), {
		recursive: true,
	});
	await writeFile(
		resolve(rootDir, ".cache", cacheIdentifier),
		JSON.stringify(result, null, 2)
	);
	return result;
};

export default async (caseName, scenarioName, options) => {
	const baselineDependencies =
		options.baselineDependencies || options.dependencies;
	const baselineScenario = options.baselineScenario || scenarioName;
	const baselineDate = options.baselineDate || options.date;
	const baselineResult = await getResult(caseName, baselineScenario, {
		...options,
		dependencies: baselineDependencies,
		date: baselineDate,
	});
	const currentResult = await getResult(caseName, scenarioName, options);
	return {
		diff: compareStatistics(baselineResult, currentResult),
		result: currentResult,
	};
};
