import { readFile, stat } from "fs/promises";
import { resolve, relative } from "path";
import { fileURLToPath } from "url";
import { runCommand } from "../lib/utils.js";

const [, , token, pow] = process.argv;
const GITHUB_ACTOR = process.env.GITHUB_ACTOR;

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");

const run = (command, args) => runCommand(command, args, true);

const dirExist = async (p) => {
	try {
		if ((await stat(p)).isDirectory()) return true;
	} catch {
		return false;
	}
};

(async () => {
	const targetDir = resolve(rootDir, ".gh-pages");
	if (!(await dirExist(targetDir))) {
		await run("git", [
			"clone",
			"--branch",
			"gh-pages",
			"--single-branch",
			"--depth",
			"1",
			token
				? `https://${GITHUB_ACTOR}:${token}@github.com/webpack/benchmark.git`
				: "https://github.com/webpack/benchmark",
			".gh-pages",
		]);
	}
	const cwd = process.cwd();
	process.chdir(targetDir);
	await run("git", ["reset", "--hard", "origin/gh-pages"]);
	await run("git", ["pull", "--rebase"]);
	process.chdir(cwd);
	const indexFile = resolve(targetDir, "results", "index.txt");
	const index = await readFile(indexFile, "utf-8");

	const d = new Date();

	const testCases = new Set();
	const scenarios = new Set();
	const dates = new Set([
		`${d.getFullYear()}-${`0${d.getMonth() + 1}`.slice(
			-2
		)}-${`0${d.getDate()}`.slice(-2)}`,
	]);
	const existing = new Set();
	for (const indexLine of index.split("\n")) {
		const match = /^([^/]+)\/([^_]+)_(.+).json/.exec(indexLine);
		if (!match) continue;
		const testCase = match[2];
		const scenario = match[3];
		const date = match[1];
		existing.add(`${date}/${testCase}_${scenario}`);
		testCases.add(testCase);
		scenarios.add(scenario);
		dates.add(date);
	}

	const missing = [];
	for (const date of Array.from(dates).sort((a, b) => (a < b ? 1 : -1))) {
		for (const testCase of testCases) {
			for (const scenario of scenarios) {
				if (!existing.has(`${date}/${testCase}_${scenario}`)) {
					missing.push({
						testCase,
						scenario,
						date,
					});
				}
			}
		}
	}

	if (missing.length === 0) {
		console.log("No missing entries");
		process.exitCode = 2;
		return;
	}
	console.log(`${missing.length} missing entries`);
	const selected =
		missing[Math.floor(Math.pow(Math.random(), pow || 1) * missing.length)];
	console.log(`::set-output name=case::${selected.testCase}`);
	console.log(`::set-output name=scenario::${selected.scenario}`);
	console.log(`::set-output name=date::${selected.date}`);
})().catch((err) => {
	process.exitCode = 1;
	console.error(err.stack);
});
