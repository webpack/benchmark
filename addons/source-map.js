import { alterFile, revertFile } from "../lib/utils.js";

export const args = ["--devtool", "source-map"];

export const setup = async (options) => {
	await alterFile("tsconfig.json", (content) => {
		return content.replace(
			/("compilerOptions": \{)/,
			'$1\n    "sourceMap": true,'
		);
	});
};

export const teardown = async (options) => {
	await revertFile("tsconfig.json");
};
