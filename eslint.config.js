import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

/**
 * ESLint flat config. Fokusnya correctness (React hooks, tipe, variabel mati);
 * format kode diserahkan ke Prettier sehingga `eslint-config-prettier`
 * mematikan semua rule yang hanya mengurus gaya.
 */
export default tseslint.config(
  {
    ignores: ["dist/", "node_modules/", "coverage/", "test-results/", "playwright-report/"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        Intl: "readonly",
        console: "readonly",
        process: "readonly",
      },
    },
    rules: {
      // `eslint-plugin-react-hooks` v7 membundel rule berbasis compiler React
      // (set-state-in-effect, purity, immutability, …). Rule itu menandai pola
      // "sinkronkan state saat mount/loading" yang dipakai `useWeather`,
      // `useLocalClock`, `Search`, dan `FavoriteCities`; memenuhinya berarti
      // refactor besar dengan risiko regresi, jadi di luar lingkup. Dua rule
      // klasik yang terbukti stabil diaktifkan eksplisit.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Repo ini memakai `any` secara sadar pada helper test dan pemetaan payload.
      "@typescript-eslint/no-explicit-any": "off",
      // Namespace global (mis. GeolocationPosition) dipakai tanpa impor.
      "@typescript-eslint/no-namespace": "off",
      // Prefiks `_` menandai parameter yang sengaja tidak dipakai (mock test).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["src/__tests__/**/*.{ts,tsx}", "tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  prettier,
);
