import { writeFile, unlink } from "fs/promises";

export const packageJson = (json) => {
	json.browserslist = "> 0.25%, not dead";
	Object.assign(json.devDependencies, {
		"@swc/core": "*",
		"swc-loader": "*",
		"regenerator-runtime": "*",
	});
	return json;
};

export const config = (content) => `${content}

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
`;
