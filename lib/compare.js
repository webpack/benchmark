import { readFile, writeFile, mkdir } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";
import measure from "./measure.js";
import { compareStatistics } from "./utils.js";

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");

const getResult = async (caseName, scenarioName, options) => {
	const cacheIdentifier = `${caseName}-${scenarioName}-${Buffer.from(
		JSON.stringify(options.dependencies)
	).toString("hex")}.json`;
	try {
		return JSON.parse(
			await readFile(resolve(rootDir, ".cache", cacheIdentifier), "utf-8")
		);
	} catch {}
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
	const baseline = options.baselineDependencies || {
		webpack: "latest",
	};
	const baselineResult = await getResult(caseName, scenarioName, {
		...options,
		dependencies: baseline,
	});
	const currentResult = await getResult(caseName, scenarioName, options);
	return compareStatistics(baselineResult, currentResult);
};
