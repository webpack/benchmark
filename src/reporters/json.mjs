import { writeFile } from "node:fs/promises";

// https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map
const replacer = (_, value) =>
  value instanceof Map ? Object.fromEntries(value.entries()) : value;

/** @type {import('../types').Reporter} */
export default (results, options) =>
  writeFile(options.output, JSON.stringify(results, replacer));
