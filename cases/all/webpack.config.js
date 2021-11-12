const { resolve } = require("path");
/** @type {import("webpack").Configuration} */
module.exports = {
	resolve: {
		extensions: [".ts", ".tsx", ".js"],
		alias: {
			"@internal": resolve(__dirname, "src/rome/internal"),
			// rome: resolve(__dirname, "src/rome/internal/virtual-packages/rome"),
		},
	},
	output: {
		hashFunction: "xxhash64",
	},
	optimization: {
		sideEffects: false,
	},
	experiments: {
		cacheUnaffected: true,
	},
	module: {
		unsafeCache: true,
		rules: [
			{
				test: /\.tsx?$/,
				loader: "ts-loader",
				options: { transpileOnly: true },
			},
		],
	},
};
if (require("webpack").version.startsWith("5")) {
	module.exports.ignoreWarnings = [
		{
			message: /export.+was not found|only default export is available soon/,
		},
	];
}

module.exports.plugins = module.exports.plugins || [];
module.exports.plugins.push(new (require("../../lib/build-plugin.cjs"))());

module.exports.plugins = module.exports.plugins || [];
module.exports.plugins.push(new (require("../../lib/build-plugin.cjs"))());
