const { resolve } = require("path");
/** @type {import("webpack").Configuration} */
module.exports = {
	entry: "./src/index.ts",
	resolve: {
		extensions: [".ts", ".tsx", ".js"],
		alias: {
			"@internal": resolve(__dirname, "src/rome/internal"),
			// rome: resolve(__dirname, "src/rome/internal/virtual-packages/rome"),
		},
	},
	module: {
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
			message: /export.+was not found/,
		},
	];
}
