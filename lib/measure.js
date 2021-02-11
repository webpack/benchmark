import { resolve } from "path";
import { fileURLToPath } from "url";
import {
	alterFile,
	revertFile,
	install,
	runScript,
	clearCaches,
	calcStatistics,
} from "./utils.js";

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");

export default async (caseName, scenarioName, options) => {
	const casePath = resolve(rootDir, "cases", caseName);
	const pkg = resolve(casePath, "package.json");
	const lockfile = resolve(casePath, "yarn.lock");
	const rootPkg = resolve(rootDir, "package.json");
	const rootLockfile = resolve(rootDir, "yarn.lock");
	const scenarioModule = await import(`../scenarios/${scenarioName}.js`);
	const scenario = { ...scenarioModule.default, ...scenarioModule };
	await clearCaches(casePath);
	let pkgData;
	await alterFile(pkg, (content) => {
		pkgData = JSON.parse(content);
		if (!options.dependencies) return content;
		pkgData = {
			...pkgData,
			dependencies: {
				...pkgData.dependencies,
				...options.dependencies,
			},
			resolutions: {
				...pkgData.resolutions,
				...options.dependencies,
			},
		};
		return JSON.stringify(pkgData, null, 2);
	});
	await alterFile(lockfile, () => null);
	await alterFile(rootPkg, () => null);
	await alterFile(rootLockfile, () => null);

	const cwd = process.cwd();
	try {
		process.chdir(casePath);
		// install
		await install(scenario.installArguments, options);
		await revertFile(rootPkg);
		await revertFile(rootLockfile);

		// setup
		if (pkgData.scripts && pkgData.scripts["bench:setup"])
			await runScript("bench:setup", options);
		if (scenario.setup) await scenario.setup(options);

		// warmup
		console.log(`${caseName} ${scenarioName} warmup`);
		console.time(`${caseName} ${scenarioName} warmup`);
		await scenario.warmup(options);
		console.timeEnd(`${caseName} ${scenarioName} warmup`);

		// measure
		const results = [];

		const maxRuns = options.runs || 1;
		const timeout = options.timeout || 5 * 60 * 1000;

		const start = Date.now();
		for (let i = 0; i < maxRuns; i++) {
			results.push(await scenario.run(options));
			const runtime = Date.now() - start;
			const percentage = Math.max(runtime / timeout, (i + 1) / maxRuns);
			console.log(
				`${caseName} ${scenarioName} ${Math.round(percentage * 100)}%`
			);
			if (runtime > timeout) break;
		}
		return options.noStatistics ? results[0] : calcStatistics(results);
	} finally {
		if (scenario.teardown) await scenario.teardown(options);
		await revertFile(pkg);
		await revertFile(lockfile);
		await revertFile(rootPkg);
		await revertFile(rootLockfile);
		process.chdir(cwd);
	}
};
