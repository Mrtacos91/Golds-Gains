import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Permitir any en casos específicos (IndexedDB, eventos, etc)
      "@typescript-eslint/no-explicit-any": "warn",
      // Permitir variables no usadas que empiecen con _
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Permitir apóstrofes en JSX
      "react/no-unescaped-entities": "off",
      // Permitir <img> (lo cambiaremos manualmente donde sea crítico)
      "@next/next/no-img-element": "warn",
      // Hooks dependencies - warn en lugar de error
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;
