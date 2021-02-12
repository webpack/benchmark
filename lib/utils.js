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

export const revertFile = (filePath) =>
	alterFile(filePath, null, { past: true });

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
	total = current.statsTime.mean
) => {
	const diff = {};
	for (const key of new Set([...Object.keys(base), ...Object.keys(current)])) {
		const baseValue = base[key];
		const currentValue = current[key];
		if (baseValue === undefined || currentValue === undefined) continue;
		if ("mean" in baseValue) {
			const getDiff = (b, c) => {
				return c / b;
			};
			diff[key] = {
				relevance: currentValue.mean / total,
			};
			for (const k of Object.keys(baseValue)) {
				diff[key][k] = currentValue[k] / baseValue[k];
			}
			diff[key].lowHigh = currentValue.high / baseValue.low;
			diff[key].highLow = currentValue.low / baseValue.high;
			diff[key].baseStdDev = baseValue.stdDev / baseValue.mean;
			diff[key].currentStdDev = currentValue.stdDev / currentValue.mean;
		} else {
			diff[key] = compareStatistics(baseValue, currentValue, total);
		}
	}
	return diff;
};

export const formatDiffTable = (diff, colors) => {
	const entries = Object.keys(diff).map((key) => ({ name: key, ...diff[key] }));
	entries.sort((a, b) => b.relevance - a.relevance);
	const offset = (factor) => {
		if (factor > 10) return `${Math.round(factor * 10) / 10}x`;
		if (factor > 1.1) return `+${Math.round(100 - factor * 100)}%`;
		if (factor > 1) return `+${Math.round(1000 - factor * 1000) / 10}%`;
		if (factor > 0.9) return `-${Math.round(1000 - factor * 1000) / 10}%`;
		return `-${Math.round(100 - factor * 100)}%`;
	};
	const percentage = (value) => {
		if (value > 10) return `${Math.round(value * 10) / 10}x`;
		if (value > 0.1) return `${Math.round(value * 100)}%`;
		if (value > -0.1) return `${Math.round(value * 1000) / 10}%`;
		return `${Math.round(value * 100)}%`;
	};
	const columns = {
		rel: (l) => `${Math.round(l.relevance * 10000) / 100}%`,
		diff: (l) =>
			l.lowHigh && l.lowHigh < 1
				? offset(l.lowHigh)
				: l.highLow && l.highLow > 1
				? offset(l.highLow)
				: "unclear",
		name: (l) => l.name,
		mean: (l) => offset(l.mean),
		med: (l) => offset(l.median),
		min: (l) => offset(l.min),
		low: (l) => offset(l.low),
		high: (l) => offset(l.high),
		max: (l) => offset(l.max),
		std: (l) => offset(l.stdDev),
		baseStd: (l) => percentage(l.baseStdDev),
		curStd: (l) => percentage(l.currentStdDev),
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
			if (colors) {
				if (row[1].startsWith("+"))
					return `\u001b[1m\u001b[31m${line}\u001b[39m\u001b[22m`;
				if (row[1].startsWith("-"))
					return `\u001b[1m\u001b[32m${line}\u001b[39m\u001b[22m`;
			}
			return line;
		}),
	].join("\n");
};
