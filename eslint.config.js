import js from '@eslint/js'
import pluginTs from '@typescript-eslint/eslint-plugin'
import parserTs from '@typescript-eslint/parser'

const mochaGlobals = {
  describe: 'readonly',
  it: 'readonly',
  before: 'readonly',
  after: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  xdescribe: 'readonly',
  xit: 'readonly',
}

const nodeGlobals = {
  process: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  Symbol: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  URL: 'readonly',
  require: 'readonly',
  module: 'readonly',
  exports: 'readonly',
}

const tsRules = {
  files: ['ts-src/**/*.ts'],
  plugins: { '@typescript-eslint': pluginTs },
  languageOptions: {
    parser: parserTs,
    parserOptions: { project: './tsconfig.eslint.json' },
    globals: { ...nodeGlobals, ...mochaGlobals },
  },
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/no-explicit-any': 'off',
    'space-before-function-paren': 'off',
    'comma-dangle': ['error', 'always-multiline'],
    'no-eval': 'off',
    'no-use-before-define': 'off',
    indent: ['error', 2],
  },
}

export default [
  js.configs.recommended,
  tsRules,
  {
    ignores: ['dist-cjs/', 'dist-esm/', 'node_modules/'],
  },
]
