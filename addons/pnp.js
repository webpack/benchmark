export const installOptions = { pnp: true };

export const packageJson = (json) => {
	Object.assign(json.dependencies, {
		"pnp-webpack-plugin": "*",
	});
	return json;
};

export const config = (content) => `${content}

if(require("webpack").version.startsWith("4")) {
	var PnpWebpackPlugin = require("pnp-webpack-plugin");

	module.exports.resolve = module.exports.resolve || {};
	module.exports.resolve.plugins = module.exports.resolve.plugins || [];
	module.exports.resolve.plugins.push(PnpWebpackPlugin);

	module.exports.resolveLoader = module.exports.resolveLoader || {};
	module.exports.resolveLoader.plugins = module.exports.resolveLoader.plugins || [];
	module.exports.resolveLoader.plugins.push(PnpWebpackPlugin.moduleLoader(module));
}
`;
