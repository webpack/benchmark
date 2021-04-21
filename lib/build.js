import { readFile } from "fs/promises";
import { spawn } from "child_process";
import { alterFile, revertFile, readFileSizes } from "./utils.js";

export default (args) => {
	let rebuildChangeFile;
	const run = async (options) => {
		let start = Date.now();
		let currentArgs = args;
		for (const addon of options.addons) {
			if (addon.args) currentArgs = currentArgs.concat(addon.args);
		}
		const p = spawn(
			"yarn",
			["webpack", ...currentArgs, ...(options.progress ? ["--progress"] : [])],
			{
				shell: true,
				stdio: options.verbose
					? ["inherit", "pipe", "inherit"]
					: ["ignore", "pipe", "ignore"],
			}
		);
		let counter = 0;
		let dataSetCounter = -1;
		let promise = Promise.resolve();
		const data = {};
		const processLine = (line) => {
			if (line === "#!# start") {
				start = Date.now();
				dataSetCounter = 0;
			} else if (line === "#!# next") {
				promise = promise.then(async () => {
					counter++;
					if (dataSetCounter >= 0) dataSetCounter++;
					await new Promise((r) =>
						setTimeout(r, Math.max(300, 1000 / counter))
					);
					await alterFile(rebuildChangeFile, (content) =>
						content.replace(/Hello World\d*/, `Hello World${counter}`)
					);
				});
			} else if (line.startsWith("#!#")) {
				const [, name, valueStr] = /^#!# (.+) = ((\d|\.|e|-)+)$/.exec(line);
				data[name] = (data[name] || 0) + +valueStr;
			} else if (options.verbose) {
				console.log(line);
			}
		};
		let remainingLine = "";
		p.stdout.on("data", (chunk) => {
			const lines = (remainingLine + chunk).split("\n");
			remainingLine = lines.pop();
			lines.forEach(processLine);
		});
		const exitCode = await new Promise((resolve) => p.once("exit", resolve));
		data.exec = Date.now() - start;
		await promise;
		Object.assign(data, await readFileSizes("dist"));
		if (exitCode !== 0) throw new Error(`Build failed with ${exitCode}`);
		if (dataSetCounter > 1) {
			for (const key of Object.keys(data)) {
				if (/ size$/.test(key)) continue;
				data[key] /= dataSetCounter;
			}
		}
		return data;
	};
	const warmup = async (options) => {
		const org = args;
		args = args.filter((a) => a !== "--watch");
		await run({
			...options,
			verbose: true,
			progress: process.env.CI ? false : true,
		});
		args = org;
	};
	const setup = async (options) => {
		const pkg = JSON.parse(await readFile("package.json"));
		rebuildChangeFile = pkg.rebuildChangeFile || "src/index.js";
		await revertFile(rebuildChangeFile);
		await alterFile(
			"webpack.config.js",
			(content) => {
				for (const addon of options.addons) {
					if (addon.config) content = addon.config(content, options);
				}
				return `${content}

module.exports.plugins = module.exports.plugins || [];
module.exports.plugins.push(new (require("../../lib/build-plugin.cjs"))());
`;
			},
			{ past: true }
		);
	};
	const teardown = async (options) => {
		await revertFile(rebuildChangeFile);
		await revertFile("webpack.config.js");
	};
	return {
		run,
		warmup,
		setup,
		teardown,
	};
};
