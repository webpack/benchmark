import build from "../lib/build.js";

export default build([
	"build",
	"--mode",
	"production",
	"--devtool",
	"source-map",
	"--cache-type",
	"filesystem",
]);
