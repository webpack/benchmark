import build from "../lib/build.js";

export default build([
	"build",
	"--mode",
	"development",
	"--cache-type",
	"filesystem",
]);
export const installArguments = ["--pnp"];
