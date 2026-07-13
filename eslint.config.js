const tsPlugin = require('@typescript-eslint/eslint-plugin');

// El plugin no restringe `files` en su config base (item 0) — sin esto, su parser se
// aplicaría a los .js/.jsx del repo también, pisando el parser por defecto de ESLint.
const TS_FILES = ['**/*.ts', '**/*.tsx'];
const tsRecommended = tsPlugin.configs['flat/recommended'].map((cfg) => ({
  files: TS_FILES,
  ...cfg,
}));

module.exports = [
  {
    ignores: ['.next', 'node_modules', 'out', '.vercel', 'build'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        React: 'readonly',
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
      },
    },
    rules: {},
  },
  ...tsRecommended,
  {
    // Ajustes al preset "recommended" para encajar con convenciones ya existentes en el repo,
    // en vez de forzar una reescritura de tipos de archivos previos a esta config.
    files: TS_FILES,
    rules: {
      // Hay `any` legítimos en formas de datos de Firebase/rutinas heredadas — advertir, no romper
      // el lint. CLAUDE.md ya pide evitar `any` en código NUEVO; esto no lo relaja para ese caso.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          // `catch (_)` es el patrón ya usado en todo el repo para "ignorar el error a propósito".
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          // `const { savedAt, ...state } = parsed` usa el resto para EXCLUIR savedAt de state.
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];
