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

	const mergedDiff = {};
	for (const { case: caseName, scenario, diff } of diffs) {
		for (const key of Object.keys(diff)) {
			mergedDiff[`${caseName} ${scenario} ${key}`] = diff[key];
		}
	}

	console.log(formatDiffTable(mergedDiff, { colors: true }));
})().catch((err) => {
	process.exitCode = 1;
	console.error(err.stack);
});
