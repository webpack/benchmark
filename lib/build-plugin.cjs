module.exports = class BuildPlugin {
	apply(compiler) {
		let counter = 0;
		compiler.hooks.afterDone.tap("BuildPlugin", () => {
			if (counter === 10) console.log("#!# start");
			if (compiler.watching) console.log("#!# next");
		});
		compiler.hooks.done.tap("BuildPlugin", (stats) => {
			if (compiler.watching) {
				counter++;
				if (counter <= 10) return;
				if (counter > 20) compiler.watching.close();
			}
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
