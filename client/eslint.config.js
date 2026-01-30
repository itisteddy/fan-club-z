import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
 
/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'android/**',
      'ios/**',
      'build/**',
      'coverage/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...(tsPlugin.configs.recommended?.rules ?? {}),
      ...(reactPlugin.configs.recommended?.rules ?? {}),
      ...(reactHooksPlugin.configs.recommended?.rules ?? {}),
      // Keep lint actionable in a large TS codebase.
      // (We still rely on TypeScript for the majority of type-safety guarantees.)
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'react-hooks/purity': 'off',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      // Newer react-hooks plugin versions add additional strict rules that are not
      // currently feasible to enforce across the entire legacy codebase.
      // Keep them non-blocking for production releases.
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/refs': 'off',
      'react/jsx-no-undef': 'off',
      'react/no-unescaped-entities': 'off',
      'no-restricted-properties': [
        'warn',
        {
          object: 'process',
          property: 'env',
          message:
            'Use import.meta.env (Vite) or env helpers from @/utils/environment. Server-only code can use process.env in vite.config or node scripts.',
        },
      ],
      'no-restricted-syntax': [
        'warn',
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message:
            'Do not use process.env in client code. Use environment helpers from @/utils/environment instead.',
        },
        {
          selector: "MemberExpression[object.object.property.name='meta'][object.property.name='env']",
          message:
            'Do not use import.meta.env directly. Use environment helpers from @/utils/environment for consistent typed access.',
        },
      ],
    },
  },
  {
    files: ['vite.config.*', 'scripts/**'],
    rules: {
      'no-restricted-properties': 'off',
      'no-restricted-syntax': 'off',
    },
  },
];

