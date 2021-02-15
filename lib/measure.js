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

export default async (caseName, scenarioAndAddons, options) => {
	const [scenarioName, ...addonNames] = scenarioAndAddons.split("+");
	const casePath = resolve(rootDir, "cases", caseName);
	const pkg = resolve(casePath, "package.json");
	const lockfile = resolve(casePath, "yarn.lock");
	const rootPkg = resolve(rootDir, "package.json");
	const rootLockfile = resolve(rootDir, "yarn.lock");
	const scenarioModule = await import(`../scenarios/${scenarioName}.js`);
	const scenario = { ...scenarioModule.default, ...scenarioModule };
	const addons = await Promise.all(
		addonNames.map((name) => import(`../addons/${name}.js`))
	);
	options = { ...options, addons };
	await clearCaches(casePath);
	let pkgData;
	await alterFile(pkg, (content) => {
		pkgData = JSON.parse(content);
		for (const addon of addons) {
			if (addon.packageJson) pkgData = addon.packageJson(pkgData, options);
		}
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
		let installOptions = {};
		// addons
		for (const addon of addons) {
			if (addon.beforeInstall) await addon.beforeInstall(options);
			if (addon.installOptions)
				installOptions = { ...installOptions, ...addon.installOptions };
		}

		// install
		await install(installOptions, options);
		await revertFile(rootPkg);
		await revertFile(rootLockfile);

		// addons
		for (const addon of addons) {
			if (addon.beforeSetup) await addon.beforeSetup(options);
		}

		// setup
		if (pkgData.scripts && pkgData.scripts["bench:setup"])
			await runScript("bench:setup", options);
		if (scenario.setup) await scenario.setup(options);

		// addons
		for (const addon of addons) {
			if (addon.setup) await addon.setup(options);
		}

		// warmup
		console.log(`${caseName} ${scenarioAndAddons} warmup`);
		console.time(`${caseName} ${scenarioAndAddons} warmup`);
		await scenario.warmup(options);
		console.timeEnd(`${caseName} ${scenarioAndAddons} warmup`);

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
				`${caseName} ${scenarioAndAddons} ${Math.round(percentage * 100)}%`
			);
			if (runtime > timeout) break;
		}
		return options.noStatistics ? results[0] : calcStatistics(results);
	} finally {
		if (scenario.teardown) await scenario.teardown(options);
		// addons
		for (const addon of addons) {
			if (addon.teardown) await addon.teardown(options);
		}
		await revertFile(pkg);
		await revertFile(lockfile);
		await revertFile(rootPkg);
		await revertFile(rootLockfile);
		process.chdir(cwd);
	}
};
