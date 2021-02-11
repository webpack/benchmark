module.exports = class BuildPerformanceReporterPlugin {
	apply(compiler) {
		compiler.hooks.done.tap("BuildPerformanceReporterPlugin", (stats) => {
			const { logging, time } = stats.toJson({
				all: false,
				timings: true,
				logging: "verbose",
			});
			console.log(`#!# statsTime = ${time}`);
			for (const name of Object.keys(logging)) {
				if (!name.startsWith("webpack.")) continue;
				const { entries } = logging[name];
				for (const { type, args } of entries) {
					if (type !== "time") continue;
					const ms = args[1] * 1000 + args[2] / 1000000;
					console.log(`#!# ${name.slice(8)}.${args[0]} = ${ms}`);
				}
			}
		});
		const old = compiler.infrastructureLogger;
		compiler.infrastructureLogger = (name, type, args) => {
			old(name, type, args);
			if (!name.startsWith("webpack.")) return;
			if (type !== "time") return;
			const ms = args[1] * 1000 + args[2] / 1000000;
			console.log(
				`#!# ${name.slice(8)}.${args[0].replace(
					/restore cache content \d.+$/,
					"restore cache content"
				)} = ${ms}`
			);
		};
	}
};
