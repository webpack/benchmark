import { readFile, writeFile, stat } from "fs/promises";
import { resolve, relative } from "path";
import { fileURLToPath } from "url";
import { runCommand } from "../lib/utils.js";
import ncpCallback from "ncp";
import { promisify } from "util";

const ncp = promisify(ncpCallback);

const [, , name, token] = process.argv;
const GITHUB_ACTOR = process.env.GITHUB_ACTOR;

if (!name) throw new Error("name argument missing");

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
	process.chdir(targetDir);
	for (let i = 0; i < 3; i++) {
		try {
			await run("git", ["reset", "--hard"]);
			await run("git", ["pull", "--rebase"]);

			console.log("== copy output files ==");
			const indexFile = resolve(targetDir, "results", "index.txt");
			const files = new Set((await readFile(indexFile, "utf-8")).split("\n"));
			files.delete("");
			await ncp(
				resolve(rootDir, "output"),
				resolve(targetDir, "results", name),
				{
					filter: (filename) => {
						if (filename.endsWith(".json")) {
							files.add(
								`${name}/${relative(
									resolve(rootDir, "output"),
									filename
								).replace(/\\/g, "/")}`
							);
						}
						return true;
					},
				}
			);

			console.log("== update index.txt ==");
			await writeFile(
				indexFile,
				Array.from(files, (f) => `${f}\n`).join("") + "\n"
			);

			console.log("== commit ==");
			await run("git", ["add", `results/${name}/*.json`, "results/index.txt"]);
			try {
				await run("git", ["commit", "-m", `"add ${name} results"`]);
			} catch {
				break;
			}

			console.log("== push ==");
			await run("git", ["push"]);
			break;
		} catch (e) {
			await new Promise((resolve) =>
				setTimeout(resolve, Math.random() * 30000)
			);
			if (i === 2) throw e;
		}
	}
})().catch((err) => {
	process.exitCode = 1;
	console.error(err.stack);
});
