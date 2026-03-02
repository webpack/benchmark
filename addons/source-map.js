import { alterFile, revertFile } from "../lib/utils.js";

export const args = ["--devtool", "source-map"];

export const setup = async () => {
	await alterFile("tsconfig.json", (content) => {
		if (typeof content !== "string") return content;

		try {
			const tsconfig = JSON.parse(content);
			tsconfig.compilerOptions = tsconfig.compilerOptions || {};
			tsconfig.compilerOptions.sourceMap = true;
			return JSON.stringify(tsconfig, null, 2) + "\n";
		} catch {
			// Fallback if JSON parsing fails
			return content.replace(
				/("compilerOptions"\s*:\s*\{)/,
				'$1\n    "sourceMap": true,'
			);
		}
	});
};

export const teardown = async () => {
	// Restore original tsconfig.json
	await revertFile("tsconfig.json");
};
