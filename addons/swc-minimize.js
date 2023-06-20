export const packageJson = (json) => {
	Object.assign(json.devDependencies, {
		"terser-webpack-plugin": "*",
	});
	return json;
};

export const config = (content) => `${content}

module.exports.optimization = {
    minimizer: [new TerserPlugin({
        minify: require("terser-webpack-plugin").swcMinify,
    })],
};
`;
