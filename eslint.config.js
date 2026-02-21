import { FlatCompat } from '@eslint/eslintrc';
import nextPlugin from '@next/eslint-plugin-next';

const compat = new FlatCompat();

const config = [
  {
    ignores: ['.next', 'node_modules', 'build', 'dist']
  },
  ...compat.config({
    extends: ['next']
  })
];

export default config;
