export const packageJson = (json) => {
	Object.assign(json.devDependencies, {
		"terser-webpack-plugin": "*",
	});
	return json;
};

export const config = (content) => `${content}

var TerserPlugin = require("terser-webpack-plugin");

module.exports.optimization = {
    minimizer: [new TerserPlugin({
        minify: TerserPlugin.swcMinify,
    })],
};
`;
