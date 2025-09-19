import js from "@eslint/js";
import { flatConfigs as importXConfigs } from "eslint-plugin-import-x";
import globals from "globals";

export default [
  { ignores: ["fixtures"] },
  js.configs.recommended,
  importXConfigs.recommended,
  {
    languageOptions: {
      globals: globals.nodeBuiltin,
    },
    rules: {
      "object-shorthand": "error",
      "import-x/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["sibling", "parent"],
            "index",
            "unknown",
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
    },
  },
];
