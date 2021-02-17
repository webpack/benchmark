module.exports = class BuildPlugin {
	apply(compiler) {
		let counter = 0;
		let isWatching = false;
		compiler.hooks.watchRun.tap("BuildPlugin", () => {
			isWatching = true;
		});
		(compiler.hooks.afterDone || compiler.hooks.done).tap("BuildPlugin", () => {
			setTimeout(() => {
				if (counter === 10) console.log("#!# start");
				if (isWatching && counter <= 20) console.log("#!# next");
			}, 10);
		});
		compiler.hooks.done.tap("BuildPlugin", (stats) => {
			if (isWatching) {
				counter++;
				if (counter <= 10) return;
				if (counter > 20) {
					if (compiler.watching) {
						compiler.watching.close();
					} else {
						process.nextTick(() => process.exit(0));
					}
				}
			}
			const { logging, time } = stats.toJson({
				all: false,
				timings: true,
				logging: "verbose",
			});
			console.log(`#!# stats = ${time}`);
			const memoryUsage = process.memoryUsage();
			console.log(`#!# heap memory = ${memoryUsage.heapUsed}`);
			console.log(`#!# rss memory = ${memoryUsage.rss}`);
			console.log(`#!# external memory = ${memoryUsage.external}`);
			console.log(`#!# array buffers memory = ${memoryUsage.arrayBuffers}`);
			for (const name of Object.keys(logging)) {
				if (!name.startsWith("webpack.")) continue;
				const { entries } = logging[name];
				for (const { type, args, message } of entries) {
					if (type !== "time") continue;
					if (args) {
						const ms = args[1] * 1000 + args[2] / 1000000;
						console.log(`#!# ${name.slice(8)}.${args[0]} = ${ms}`);
					} else {
						const [, label, msStr] = /^(.+): ([\d.]+)ms$/.exec(message);
						console.log(`#!# ${name.slice(8)}.${label} = ${msStr}`);
					}
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
