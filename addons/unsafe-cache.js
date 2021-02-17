export const config = (content) => `${content}

module.exports.module = module.exports.module || {};
module.exports.module.unsafeCache = true;
module.exports.resolve = module.exports.resolve || {};
if(!require("webpack").version.startsWith("4")) module.exports.resolve.cache = false;
module.exports.resolve.unsafeCache = true;
`;
