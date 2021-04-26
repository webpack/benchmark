export const config = (content) => `${content}

module.exports.module = module.exports.module || {};
module.exports.module.unsafeCache = true;
`;
