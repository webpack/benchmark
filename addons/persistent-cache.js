export const config = (content) => `${content}

if(!require("webpack").version.startsWith("4")) {
	module.exports.cache = { type: "filesystem" };
}
`;

export const keepBuildCache = true;
