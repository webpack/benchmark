export const packageJson = (json) => {
	json.browserslist = "> 0.25%, not dead";
	Object.assign(json.dependencies, {
		"@babel/core": "*",
		"@babel/preset-env": "*",
		"babel-loader": "*",
		"core-js": "*",
		"regenerator-runtime": "*",
	});
	return json;
};

export const config = (content) => `${content}

module.exports.module = module.exports.module || {};
module.exports.module.rules = module.exports.module.rules || [];
module.exports.module.rules.unshift({
	test: /\.(js|tsx?)$/,
	use: {
		loader: "babel-loader",
		options: {
			sourceType: "unambiguous",
			presets: [["@babel/env", {
				useBuiltIns: "usage",
				corejs: +require("core-js/package.json").version.slice(0, 1)
			}]]
		}
	}
});
`;
