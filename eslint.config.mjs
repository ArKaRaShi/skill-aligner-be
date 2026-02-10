// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // Allow unused vars prefixed with _ (common pattern)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // Prevent magic numbers in precision-related operations
      // Allow common numbers: indices/counters (0, 1, 2), percentage (100),
      // multipliers (10, 1000), error codes (-1), common scores (3 for Likert scale),
      // HTTP status (200), embedding dimensions (768, 1536), common limits (5, 20)
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          ignore: [
            -1, 0, 1, 2, 3, // Indices, counters, Likert scale
            4, 5, 6, 7, // Common small integers
            10, 12, 15, // Common limits/counts
            20, 24, // Common limits, hours in day
            60, 75, 99, 100, // Timeout/cache TTL, percentages, codes
            200, 300, // HTTP OK, common limits
            543, 1000, // Academic codes, multipliers
            768, 1536, // Embedding dimensions (small/large models)
            1_000_000, // Token multiplier
            2023, 2024, 2025, // Years
            // Common decimal thresholds
            0.1, 0.2, 0.25, 0.3, 0.4, 0.5, // Common fractions
            0.6, 0.7, 0.75, 0.8, 0.9, // Common percentages
          ],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
        },
      ],
    },
  },
  {
    // Test file overrides - relax rules for tests
    files: ['**/*.spec.ts', '**/*.test.ts', '**/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      // Allow magic numbers in test fixtures and data
      '@typescript-eslint/no-magic-numbers': 'off',
    },
  },
  {
    // Query logging module - intentional flexible JSONB storage
    files: [
      'src/modules/query-logging/**/*.ts',
      'src/shared/utils/llm-metadata.builder.ts',
    ],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },
);
