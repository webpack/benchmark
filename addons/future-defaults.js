export const config = (content) => `${content}

module.exports.experiments = module.exports.experiments || {};
module.exports.experiments.futureDefaults = true;
`;
