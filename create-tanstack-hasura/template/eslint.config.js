import js from "@eslint/js"
import prettierConfig from "eslint-config-prettier"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"

export default tseslint.config(
    {
        ignores: [
            ".output/**",
            ".tanstack/**",
            ".nitro/**",
            "dist/**",
            "dist-ssr/**",
            "node_modules/**",
            "src/routeTree.gen.ts",
        ],
    },
    {
        files: ["**/*.{js,mjs,cjs,ts,tsx}"],
        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommended,
            prettierConfig,
        ],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "react-refresh/only-export-components": [
                "warn",
                {
                    allowConstantExport: true,
                    allowExportNames: ["Route"],
                },
            ],
        },
    },
    {
        files: ["src/routes/**/*.{ts,tsx}"],
        rules: {
            "react-refresh/only-export-components": "off",
        },
    },
)
