export const config = (content) => `${content}

module.exports.optimization = module.exports.optimization || {};
module.exports.optimization.concatenateModules = false;
`;
