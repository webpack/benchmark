import { writeFile, unlink } from "fs/promises";

export const packageJson = (json) => {
	json.browserslist = "> 0.25%, not dead";
	Object.assign(json.devDependencies, {
		"@babel/core": "*",
		"@babel/preset-env": "*",
		"babel-loader": "*",
		"core-js": "*",
		"regenerator-runtime": "*",
		"thread-loader": "*",
	});
	return json;
};

export const setup = async () => {
	await writeFile(
		".babelrc.js",
		`module.exports = {
	sourceType: "unambiguous",
	presets: [["@babel/env", {
		useBuiltIns: "usage",
		corejs: +require("core-js/package.json").version.slice(0, 1)
	}]]
}`
	);
};

export const teardown = async () => {
	try {
		await unlink(".babelrc.js");
	} catch (e) {}
};

export const config = (content) => `${content}

module.exports.module = module.exports.module || {};
module.exports.module.rules = module.exports.module.rules || [];
module.exports.module.rules.unshift({
	test: /\.(js|tsx?)$/,
	use: [
		{
			loader: "thread-loader",
			options: {
				poolRespawn: true
			}
		},
		{
			loader: "babel-loader"
		}
	]
});
`;
