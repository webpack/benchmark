import {
	readFile,
	readdir,
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
import { gzip as gzipCallback } from "zlib";
import { promisify } from "util";
import { createServer } from "./custom-registry.js";
const gzip = promisify(gzipCallback);

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

export const runCommand = async (command, args, verbose, env) => {
	const p = spawn(command, args, {
		shell: true,
		stdio: verbose ? "inherit" : "ignore",
		env: env
			? {
					...process.env,
					...env,
			  }
			: undefined,
	});
	const exitCode = await new Promise((resolve) => p.once("exit", resolve));
	if (exitCode !== 0)
		throw new Error(`${command} ${args.join(" ")} failed with ${exitCode}`);
};

export const install = async ({ pnp }, { verboseSetup, date }) => {
	let close;
	try {
		if (pnp) {
			await runCommand("yarn", ["set", "version", "berry"], verboseSetup);
		}

		if (date) {
			close = await createServer(date);
		}

		if (date) console.log("Will install dependencies as of " + date);
		await runCommand(
			"yarn",
			["install"],
			verboseSetup,
			date
				? pnp
					? {
							YARN_NPM_REGISTRY_SERVER: "http://localhost:3333",
							YARN_UNSAFE_HTTP_WHITELIST: "localhost",
					  }
					: { YARN_REGISTRY: "http://localhost:3333" }
				: undefined
		);
	} finally {
		if (close) {
			await close();
		}
	}
};

export const runScript = async (name, options) => {
	await runCommand("yarn", ["run", name], options.verboseSetup);
};

export const clearCaches = async (directory) => {
	const paths = [
		"node_modules/.cache",
		".yarn/.cache",
		".cache",
		".pnp.js",
		"dist",
		".yarnrc.yml",
	];
	await Promise.all(
		paths.map((p) =>
			rmdir(resolve(directory, p), {
				recursive: true,
				maxRetries: 10,
			})
		)
	);
};

export const clearBuildCaches = async (directory) => {
	const paths = ["node_modules/.cache", "dist"];
	await Promise.all(
		paths.map((p) =>
			rmdir(resolve(directory, p), {
				recursive: true,
				maxRetries: 10,
			})
		)
	);
};

export const readFileSizes = async (directory) => {
	const result = {};
	const entries = await readdir(directory, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.isFile()) {
			const stats = await stat(resolve(directory, entry.name));
			result[`${entry.name} size`] = stats.size;
			result[`${entry.name} gzip size`] = (
				await gzip(await readFile(resolve(directory, entry.name)), { level: 9 })
			).length;
		}
	}
	return result;
};

const T_TABLE = [
	12.71,
	4.303,
	3.182,
	2.776,
	2.571,
	2.447,
	2.365,
	2.306,
	2.262,
	2.228,
	2.201,
	2.179,
	2.16,
	2.145,
	2.131,
	2.12,
	2.11,
	2.101,
	2.093,
	2.086,
	2.08,
	2.074,
	2.069,
	2.064,
	2.06,
	2.056,
	2.052,
	2.048,
	2.045,
	2.042,
];

const tDist95Two = (n) => {
	if (n <= 1) return 12.71;
	if (n <= 30) return T_TABLE[n - 1];
	if (n <= 40) return 2.021;
	if (n <= 50) return 2.009;
	if (n <= 60) return 2.0;
	if (n <= 80) return 1.99;
	if (n <= 100) return 1.984;
	if (n <= 120) return 1.98;
	return 1.96;
};

export const calcStatistics = (results) => {
	const stats = {};
	for (const key of Object.keys(results[0])) {
		const values = results.map((r) => r[key] || 0);
		if (typeof values[0] === "object") {
			stats[key] = calcStatistics(values);
		} else {
			values.sort();
			const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
			const variance =
				values.reduce((sum, v) => sum + (mean - v) ** 2, 0) / values.length;
			const stdDev = Math.sqrt(variance);
			const confidence =
				(tDist95Two(values.length - 1) * stdDev) / Math.sqrt(values.length);
			const low = Math.max(0, mean - confidence);
			const high = mean + confidence;
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
				confidence: high - low,
				low,
				high,
				count: values.length,
			};
		}
	}
	return stats;
};

export const normalizeResult = (results, base) => {
	const stats = {};
	for (const key of Object.keys(results)) {
		const value = results[key];
		const normalizedValue = { ...value };
		normalizedValue.base = base;
		stats[key] = normalizedValue;
	}
	return stats;
};

const getType = (name) => {
	if (name.endsWith(" memory")) return "memory";
	if (name.endsWith(" gzip size")) return "gzip size";
	if (name.endsWith(" size")) return "size";
	return "time";
};

const typeOrder = {
	time: 0,
	memory: 1,
	size: 2,
	"gzip size": 3,
};

export const compareStatistics = (
	base,
	current,
	totals = {
		time: current.stats.mean,
		size: Object.keys(current)
			.filter((n) => getType(n) === "size")
			.reduce((sum, key) => sum + current[key].mean, 0),
		"gzip size": Object.keys(current)
			.filter((n) => getType(n) === "gzip size")
			.reduce((sum, key) => sum + current[key].mean, 0),
		memory: Object.keys(current)
			.filter((n) => getType(n) === "memory")
			.reduce((sum, key) => sum + current[key].mean, 0),
	}
) => {
	const diff = {};
	for (const key of new Set([...Object.keys(base), ...Object.keys(current)])) {
		const baseValue = base[key];
		const currentValue = current[key];
		if (baseValue === undefined || currentValue === undefined) continue;
		if ("mean" in baseValue) {
			const type = getType(key);
			diff[key] = {
				type,
				relevance: currentValue.mean / totals[type],
			};
			for (const k of Object.keys(baseValue)) {
				diff[key][k] =
					baseValue[k] === 0 && currentValue[k] === 0
						? 1
						: currentValue[k] / baseValue[k];
			}
			diff[key].lowHigh = currentValue.high / baseValue.low;
			diff[key].highLow = currentValue.low / baseValue.high;
			diff[key].baseStdDev = baseValue.stdDev / baseValue.mean;
			diff[key].currentStdDev = currentValue.stdDev / currentValue.mean;
			diff[key].baseConfidence = baseValue.confidence / baseValue.mean;
			diff[key].currentConfidence = currentValue.confidence / currentValue.mean;
		} else {
			diff[key] = compareStatistics(baseValue, currentValue, totals);
		}
	}
	return diff;
};

export const formatTable = (entries, columns, { postRow }) => {
	if (entries.length === 0) return undefined;
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
			return postRow(line, row);
		}),
	].join("\n");
};

export const formatDiffTable = (
	diff,
	{ colors, verbose, limit, threshold }
) => {
	let entries = Object.keys(diff).map((key) => ({ name: key, ...diff[key] }));
	entries.sort((a, b) => {
		if (a.type !== b.type) {
			return typeOrder[a.type] - typeOrder[b.type];
		}
		return b.relevance - a.relevance;
	});
	if (!verbose) {
		entries = entries.filter((e) => e.lowHigh < 1 || e.highLow > 1);
	}
	if (threshold) {
		entries = entries.filter((e) => e.relevance >= threshold);
	}
	if (limit) {
		entries = entries.slice(0, limit);
	}
	if (entries.length === 0) return undefined;
	const offset = (factor) => {
		if (factor > 10) return `${Math.round(factor * 10) / 10}x`;
		if (factor > 1.1) return `+${Math.round(factor * 100 - 100)}%`;
		if (factor > 1) return `+${Math.round(factor * 1000 - 1000) / 10}%`;
		if (factor === 1) return `=`;
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
		...(verbose
			? {
					med: (l) => offset(l.median),
					min: (l) => offset(l.min),
					max: (l) => offset(l.max),
					std: (l) => offset(l.stdDev),
					con: (l) => offset(l.confidence),
			  }
			: undefined),
		baseCon: (l) => percentage(l.baseConfidence),
		curCon: (l) => percentage(l.currentConfidence),
	};
	return formatTable(entries, columns, {
		postRow: (line, row) => {
			if (colors) {
				if (row[1].startsWith("+") || row[1].endsWith("x"))
					return `\u001b[1m\u001b[31m${line}\u001b[39m\u001b[22m`;
				if (row[1].startsWith("-"))
					return `\u001b[1m\u001b[32m${line}\u001b[39m\u001b[22m`;
			}
			return line;
		},
	});
};

export const formatResultTable = (
	result,
	{ colors, verbose, limit, threshold }
) => {
	let entries = Object.keys(result).map((key) => ({
		name: key,
		...result[key],
	}));
	entries.sort((a, b) => {
		const aType = getType(a.name);
		const bType = getType(b.name);
		if (aType !== bType) {
			return typeOrder[aType] - typeOrder[bType];
		}
		return b.median - a.median;
	});
	if (threshold) {
		entries = entries.filter((e) => e.relevance >= threshold);
	}
	if (limit) {
		entries = entries.slice(0, limit);
	}
	if (entries.length === 0) return undefined;
	const f = (name, value) => {
		if (name.endsWith(" size")) return bytes(value);
		if (name.endsWith(" memory")) return bytes(value);
		return ms(value);
	};
	const bytes = (value) => {
		if (value === 0) return `-`;
		if (value > 1024 * 102400) return `${Math.round(value / 1024 / 1024)} MiB`;
		if (value > 1024 * 10240)
			return `${Math.round(value / 1024 / 102.4) / 10} MiB`;
		if (value > 1024 * 1024)
			return `${Math.round(value / 1024 / 10.24) / 100} MiB`;
		if (value > 102400) return `${Math.round(value / 1024)} KiB`;
		if (value > 10240) return `${Math.round(value / 102.4) / 10} KiB`;
		if (value > 1024) return `${Math.round(value / 10.24) / 100} KiB`;
		return `${Math.round(value)} bytes`;
	};
	const ms = (value) => {
		if (value === 0) return `0 ms`;
		if (value > 100000) return `${Math.round(value / 1000)} s`;
		if (value > 10000) return `${Math.round(value / 100) / 10} s`;
		if (value > 1000) return `${Math.round(value / 10) / 100} s`;
		if (value > 10) return `${Math.round(value)} ms`;
		if (value > 1) return `${Math.round(value * 10) / 10} ms`;
		if (value > 0.1) return `${Math.round(value * 100) / 100} ms`;
		if (value > 0.01) return `${Math.round(value * 1000)} µs`;
		return `${Math.round(value * 10000) / 10} µs`;
	};
	const columns = {
		name: (l) => l.name,
		median: (l) => f(l.name, l.median),
		mean: (l) => f(l.name, l.mean),
		...(verbose
			? {
					stdDev: (l) => f(l.name, l.stdDev),
					min: (l) => f(l.name, l.min),
					max: (l) => f(l.name, l.max),
					low: (l) => f(l.name, l.low),
					high: (l) => f(l.name, l.high),
					con: (l) => f(l.name, l.confidence),
					con: (l) => f(l.name, l.confidence),
					n: (l) => `${l.count}`,
			  }
			: undefined),
	};
	return formatTable(entries, columns, {
		postRow: (line, row) => {
			if (colors) {
				if (row[1].startsWith("+") || row[1].endsWith("x"))
					return `\u001b[1m\u001b[31m${line}\u001b[39m\u001b[22m`;
				if (row[1].startsWith("-"))
					return `\u001b[1m\u001b[32m${line}\u001b[39m\u001b[22m`;
			}
			return line;
		},
	});
};

export const parseDependencies = (value) => {
	const deps = {};
	for (const str of value.split(",")) {
		const match = /^([^@]+)@(.+)$/.exec(str.trim());
		if (!match) continue;
		const [, key, value] = match;
		deps[key] = value;
	}
	return deps;
};
