import { readdir, readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { formatDiffTable } from "../lib/utils.js";

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");

(async () => {
	const diffNames = await readdir(resolve(rootDir, "output"));
	const diffs = await Promise.all(
		diffNames.map(async (name) => ({
			case: name.split("_")[0],
			scenario: name.split("_")[1].replace(".json", ""),
			diff: JSON.parse(
				await readFile(resolve(rootDir, "output", name), "utf-8")
			),
		}))
	);

	const getMergedDiff = ({ caseFilter, scenarioFilter } = {}) => {
		const mergedDiff = {};
		for (const { case: caseName, scenario, diff } of diffs) {
			if (caseFilter && caseName !== caseFilter) continue;
			if (scenarioFilter && scenario !== scenarioFilter) continue;
			for (const key of Object.keys(diff)) {
				let name = key;
				if (!scenarioFilter) name = `${scenario} ${name}`;
				if (!caseFilter) name = `${caseName} ${name}`;
				mergedDiff[name] = diff[key];
			}
		}
		return mergedDiff;
	};

	const output = (header, filters, options) => {
		const diff = formatDiffTable(getMergedDiff(filters), {
			colors: true,
			...options,
		});
		if (diff) {
			console.log(header);
			console.log();
			console.log(diff);
			console.log();
		}
	};

	output("# Summary", {}, { limit: 20 });

	const cases = new Set(diffs.map((d) => d.case));
	const scenarios = new Set(diffs.map((d) => d.scenario));

	console.log("# By scenario");
	console.log();
	for (const scenario of scenarios) {
		output(`## ${scenario}`, { scenarioFilter: scenario });
	}
	console.log();

	console.log("# By case");
	console.log();
	for (const caseName of cases) {
		output(`## ${caseName}`, { caseFilter: caseName });
	}
})().catch((err) => {
	process.exitCode = 1;
	console.error(err.stack);
});
