import { writeFile, unlink } from "fs/promises";

export const packageJson = (json) => {
	json.browserslist = "> 0.25%, not dead";
	Object.assign(json.devDependencies, {
		"@swc/core": "*",
		browserslist: "*",
		"swc-loader": "*",
		"regenerator-runtime": "*",
		"terser-webpack-plugin": "*",
	});
	return json;
};

export const setup = async () => {
	await writeFile(
		".swcrc",
		JSON.stringify(
			{
				jsc: {
					parser: {
						syntax: "ecmascript",
						dynamicImport: true,
					},
				},
				env: {},
			},
			null,
			2
		)
	);
};

export const teardown = async () => {
	try {
		await unlink(".swcrc");
	} catch (e) {}
};

export const config = (content) => `${content}

var TerserPlugin = require("terser-webpack-plugin");

module.exports.module = module.exports.module || {};
module.exports.module.rules = module.exports.module.rules || [];
module.exports.module.rules.unshift({
	test: /\.(js|tsx?)$/,
	use: [
		{
			loader: "swc-loader"
		}
	]
});

module.exports.optimization = {
    minimizer: [new TerserPlugin({
        minify: TerserPlugin.swcMinify,
    })],
};
`;
