import eslintConfigPrettier from "eslint-config-prettier";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTypescript,
  eslintConfigPrettier,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "legacy/server/**",
      "legacy/js/**",
      "legacy/app.js",
      /** Extension subproject: CommonJS bundles, vendored unrar, webpack config */
      "bookmarkfs/**",
      /** Copied minified worker — not authored in this repo */
      "public/pdfjs/**"
    ]
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ]
    }
  }
];

export default config;
