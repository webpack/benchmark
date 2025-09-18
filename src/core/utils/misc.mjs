import { exists } from "./file.mjs";
import { join } from "node:path";
import { join as posixJoin } from "node:path/posix";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const moduleCache = new Map();

/**
 * Loads a module from the root of `src/`
 * @param {string} module The module to load
 * @param {boolean} instantiate Whether or not to treat the module as a class that must be instantiated
 */
export async function loadModule(module, instantiate = false) {
  let mod = moduleCache.get(module);

  if (!mod) {
    mod = await import(import.meta.resolve(posixJoin("../../", module)));
    moduleCache.set(module, mod);
  }

  return instantiate ? new mod.default() : (mod.default ?? mod);
}

const runCommand = promisify(execFile);

/**
 * Install dependencies needed for a fixture
 * @param {string} fixture
 */
export async function prepareFixture(fixture) {
  if (exists(join(fixture, "package.json"))) {
    await runCommand("npm", ["install", "--no-package-lock"], {
      cwd: fixture,
      shell: true,
    });
  }
}
