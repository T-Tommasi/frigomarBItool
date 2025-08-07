import js from "@eslint/js";
import globals from "globals";
import googleappsscript from "eslint-plugin-googleappsscript";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js, googleappsscript },
    extends: ["js/recommended"],
    env: {
      "googleappsscript/googleappsscript": true,
    },
    languageOptions: { globals: globals.browser },
  },
]);
