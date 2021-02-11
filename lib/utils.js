import {
	readFile,
	writeFile,
	stat,
	rename,
	copyFile,
	rmdir,
	utimes,
	unlink,
} from "fs/promises";
import { spawn } from "child_process";
import { resolve } from "path";

export const alterFile = async (filePath, fn, options = {}) => {
	const orginalFile = `${filePath}.original`;
	let baseFile = filePath;
	try {
		if ((await stat(orginalFile)).isFile()) {
			baseFile = orginalFile;
		}
	} catch {}
	let content = null;
	try {
		content = await readFile(baseFile, "utf-8");
	} catch {}
	if (fn) {
		if (baseFile === filePath && content !== null) {
			await copyFile(filePath, orginalFile);
		}
		const newContent = fn(content);
		if (content !== newContent || baseFile !== filePath) {
			if (newContent === null) {
				try {
					await unlink(filePath);
				} catch {}
			} else {
				await writeFile(filePath, newContent);
				if (options.past) {
					await utimes(filePath, 1, 1);
				}
			}
		}
	} else if (baseFile !== filePath) {
		await rename(baseFile, filePath);
	}
};

export const revertFile = (filePath) => alterFile(filePath);

const runCommand = async (command, args, verbose) => {
	const p = spawn(command, args, {
		shell: true,
		stdio: verbose ? "inherit" : "ignore",
	});
	const exitCode = await new Promise((resolve) => p.once("exit", resolve));
	if (exitCode !== 0)
		throw new Error(`${command} ${args.join(" ")} failed with ${exitCode}`);
};

export const install = async (pnp, options) => {
	if (pnp) {
		await runCommand("yarn", ["set", "version", "berry"], options.verboseSetup);
	}
	await runCommand("yarn", ["install"], options.verboseSetup);
};

export const runScript = async (name, options) => {
	await runCommand("yarn", ["run", name], options.verboseSetup);
};

export const clearCaches = async (directory) => {
	const paths = ["node_modules/.cache", ".pnp.js", ".yarnrc.yml"];
	await Promise.all(
		paths.map((p) =>
			rmdir(resolve(directory, p), {
				recursive: true,
				maxRetries: 10,
			})
		)
	);
};

export const calcStatistics = (results) => {
	const stats = {};
	for (const key of Object.keys(results[0])) {
		const values = results.map((r) => r[key]);
		if (typeof values[0] === "object") {
			stats[key] = calcStatistics(values);
		} else {
			values.sort();
			const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
			const variance =
				values.reduce((sum, v) => sum + (mean - v) ** 2, 0) / values.length;
			const stdDev = Math.sqrt(variance);
			stats[key] = {
				min: Math.min(...values),
				max: Math.max(...values),
				mean,
				median:
					values.length % 2 === 0
						? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
						: values[(values.length - 1) / 2],
				variance,
				stdDev,
				low: mean - stdDev,
				high: mean + stdDev,
				count: values.length,
			};
		}
	}
	return stats;
};

export const compareStatistics = (
	base,
	current,
	total = current.execTime.mean
) => {
	const diff = {};
	for (const key of new Set([...Object.keys(base), ...Object.keys(current)])) {
		const baseValue = base[key];
		const currentValue = current[key];
		if (baseValue === undefined || currentValue === undefined) continue;
		if ("mean" in baseValue) {
			const getDiff = (b, c) => {
				if (b > c) {
					return `-${Math.round((1 - c / b) * 100)}%`;
				} else {
					return `+${Math.round((c / b - 1) * 100)}%`;
				}
			};
			diff[key] = {
				relevance: (currentValue.mean / total) * 100,
			};
			for (const k of Object.keys(baseValue)) {
				diff[key][k] = getDiff(baseValue[k], currentValue[k]);
			}
			diff[key].lowHigh = getDiff(baseValue.low, currentValue.high);
			diff[key].highLow = getDiff(baseValue.high, currentValue.low);
			diff[key].baseStdDev = `${Math.round(
				(baseValue.stdDev / baseValue.mean) * 100
			)}%`;
			diff[key].currentStdDev = `${Math.round(
				(currentValue.stdDev / currentValue.mean) * 100
			)}%`;
		} else {
			diff[key] = compareStatistics(baseValue, currentValue, total);
		}
	}
	return diff;
};

export const formatDiffTable = (diff) => {
	const entries = Object.keys(diff).map((key) => ({ name: key, ...diff[key] }));
	entries.sort((a, b) => b.relevance - a.relevance);
	const columns = {
		rel: (l) => `${Math.round(l.relevance * 100) / 100}%`,
		diff: (l) =>
			l.lowHigh && l.lowHigh.startsWith("-")
				? l.lowHigh
				: l.highLow && l.highLow.startsWith("+")
				? l.highLow
				: "unclear",
		name: (l) => l.name,
		mean: (l) => l.mean,
		med: (l) => l.median,
		min: (l) => l.min,
		low: (l) => l.low,
		high: (l) => l.high,
		max: (l) => l.max,
		std: (l) => l.stdDev,
		baseStd: (l) => l.baseStdDev,
		curStd: (l) => l.currentStdDev,
	};
	const rows = entries.map((entry) =>
		Object.keys(columns).map((key) => columns[key](entry) || "")
	);
	const header = Object.keys(columns);
	const columnSizes = header.map((key, i) =>
		Math.max(key.length, ...rows.map((row) => row[i].length))
	);
	const getLine = (l) =>
		`| ${l
			.map((item, i) => `${item}${" ".repeat(columnSizes[i] - item.length)}`)
			.join(" | ")} |`;
	return [
		getLine(header),
		`| ${columnSizes.map((s) => "-".repeat(s)).join(" | ")} |`,
		...rows.map((row) => {
			const line = getLine(row);
			if (row[1].startsWith("+"))
				return `\u001b[1m\u001b[31m${line}\u001b[39m\u001b[22m`;
			if (row[1].startsWith("-"))
				return `\u001b[1m\u001b[32m${line}\u001b[39m\u001b[22m`;
			return line;
		}),
	].join("\n");
};
