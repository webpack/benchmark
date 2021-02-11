import { spawn } from "child_process";
import { resolve } from "path";
import { stat } from "fs/promises";
import { alterFile, revertFile } from "./utils.js";

const exists = async (filePath) => {
	try {
		if ((await stat(filePath)).isFile()) return true;
	} catch {}
	return false;
};

export default (args) => {
	const run = async (options) => {
		const start = Date.now();
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
		const data = {};
		const processLine = (line) => {
			if (line.startsWith("#!#")) {
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
		if (exitCode !== 0) throw new Error(`Build failed with ${exitCode}`);
		return data;
	};
	const warmup = (options) =>
		run({ ...options, verbose: true, progress: true });
	const setup = async (options) => {
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
		await revertFile("webpack.config.js");
	};
	return {
		run,
		warmup,
		setup,
		teardown,
	};
};
