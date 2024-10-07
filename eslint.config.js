// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
	{
		ignores: ["node_modules/**", "main.js"],
	},
	{
		rules: {
			// "@typescript-eslint/explicit-function-return-type": "error",
			// "no-console": ["error", { allow: ["warn", "error"] }],
		},
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},
	eslint.configs.recommended,
	...tseslint.configs.strict,
	...tseslint.configs.stylistic,
);
