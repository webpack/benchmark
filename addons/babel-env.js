export const packageJson = (json) => {
	json.browserslist = "> 0.25%, not dead";
	Object.assign(json.dependencies, {
		"@babel/core": "^7.12.16",
		"@babel/preset-env": "^7.12.16",
		"babel-loader": "^8.2.2",
		"core-js": "^3.8.3",
	});
	return json;
};

export const config = (content) => `${content}

module.exports.module = module.exports.module || {};
module.exports.module.rules = module.exports.module.rules || [];
module.exports.module.rules.push({
	test: /\.js$/,
	use: {
		loader: "babel-loader",
		options: {
			sourceType: "unambiguous",
			presets: [["@babel/env", {
				useBuiltIns: "usage",
				corejs: 3
			}]]
		}
	}
});
`;
