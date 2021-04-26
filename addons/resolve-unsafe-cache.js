export const config = (content) => `${content}

module.exports.resolve = module.exports.resolve || {};
if(!require("webpack").version.startsWith("4") && !module.exports.cache) module.exports.resolve.cache = false;
module.exports.resolve.unsafeCache = true;
`;
