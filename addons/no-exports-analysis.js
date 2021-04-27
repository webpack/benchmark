export const config = (content) => `${content}

module.exports.optimization = module.exports.optimization || {};
module.exports.optimization.providedExports = false;
module.exports.optimization.usedExports = false;
module.exports.optimization.sideEffects = false;
if(!require("webpack").version.startsWith("4")) {
	module.exports.optimization.mangleExports = false;
	module.exports.optimization.innerGraph = false;
}
`;
