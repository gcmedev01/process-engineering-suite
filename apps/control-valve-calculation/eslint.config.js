import { nextJsConfig } from "@repo/eslint-config/next-js";

export default [
  ...nextJsConfig,
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "off",
      "react/no-children-prop": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/rules-of-hooks": "off",
      "turbo/no-undeclared-env-vars": "off",
      "no-case-declarations": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-unsafe-optional-chaining": "off",
      "react/prop-types": "off",
    },
  },
];
