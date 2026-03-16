import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  // Global ignores
  {
    ignores: ["**/dist/**", "**/node_modules/**", "data/**", "**/*.js", "**/*.mjs"],
  },

  // Base JS rules
  js.configs.recommended,

  // TypeScript rules for all .ts/.tsx files
  ...tseslint.configs.recommended,

  // Shared config for all TypeScript files
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Enforce consistent type imports
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // Allow unused vars starting with _ (common pattern for ignored params)
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Disallow non-null assertions (use proper type narrowing instead)
      "@typescript-eslint/no-non-null-assertion": "warn",

      // Prefer nullish coalescing (??) over logical OR (||) for nullable values
      "@typescript-eslint/prefer-nullish-coalescing": "off",

      // Allow explicit any in some cases (scraper deals with untyped HTML)
      "@typescript-eslint/no-explicit-any": "warn",

      // No floating promises (must await or void)
      "@typescript-eslint/no-floating-promises": "off",

      // Consistent return types
      "@typescript-eslint/explicit-function-return-type": "off",

      // No unnecessary conditions
      "no-constant-condition": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // General best practices
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      "prefer-template": "warn",
      "object-shorthand": "warn",
    },
  },

  // Scraper-specific: allow console.log (used for logging)
  {
    files: ["scraper/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },

  // Frontend-specific: React rules
  {
    files: ["frontend/**/*.tsx", "frontend/**/*.ts"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },

  // Test files: relax some rules
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },

  // Prettier must be last to override formatting rules
  eslintConfigPrettier,
);
