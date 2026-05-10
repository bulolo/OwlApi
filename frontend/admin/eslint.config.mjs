import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Auto-generated files:
    "src/lib/sdk/**",
  ]),
  // Project-level rule overrides.
  {
    rules: {
      // Downgrade from error: setState in useEffect is valid for data-sync
      // patterns (e.g. initialising form state from server-fetched data).
      "react-hooks/set-state-in-effect": "warn",
      // Downgrade from error: JSX inside try/catch is a valid render-guard
      // pattern; real error boundaries can be added incrementally.
      "react-hooks/error-boundaries": "warn",
      // Downgrade from error: `any` is acceptable during rapid development.
      "@typescript-eslint/no-explicit-any": "warn",
      // Downgrade from error: empty interfaces are used as placeholder types.
      "@typescript-eslint/no-empty-object-type": "warn",
      // Downgrade from error: require() is used in Next.js config scripts.
      "@typescript-eslint/no-require-imports": "warn",
      // Downgrade from error: unescaped entities are harmless in Chinese UI text.
      "react/no-unescaped-entities": "warn",
    },
  },
]);

export default eslintConfig;
