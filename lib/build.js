import { spawn } from "child_process";
import { alterFile, revertFile } from "./utils.js";

export default (args) => {
	const run = async (options) => {
		let start = Date.now();
		const p = spawn(
			"yarn",
			["webpack", ...args, ...(options.progress ? ["--progress"] : [])],
			{
				shell: true,
				stdio: options.verbose
					? ["inherit", "pipe", "inherit"]
					: ["ignore", "pipe", "ignore"],
			}
		);
		let counter = 0;
		let promise = Promise.resolve();
		const data = {};
		const processLine = (line) => {
			if (line === "#!# start") {
				start = Date.now();
			} else if (line === "#!# next") {
				promise = promise.then(async () => {
					counter++;
					await new Promise((r) =>
						setTimeout(r, Math.max(300, 1000 / counter))
					);
					await alterFile("src/index.js", (content) =>
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
		data.execTime = Date.now() - start;
		await promise;
		if (exitCode !== 0) throw new Error(`Build failed with ${exitCode}`);
		return data;
	};
	const warmup = async (options) => {
		const org = args;
		args = args.filter((a) => a !== "--watch");
		await run({ ...options, verbose: true, progress: true });
		args = org;
	};
	const setup = async (options) => {
		await revertFile("src/index.js");
		await alterFile(
			"webpack.config.js",
			(content) => {
				return `${content}

module.exports.plugins = module.exports.plugins || [];
module.exports.plugins.push(new (require("../../lib/build-plugin.cjs"))());
`;
			},
			{ past: true }
		);
	};
	const teardown = async (options) => {
		await revertFile("src/index.js");
		await revertFile("webpack.config.js");
	};
	return {
		run,
		warmup,
		setup,
		teardown,
	};
};
