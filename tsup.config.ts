import { defineConfig } from 'tsup'
import { writeFileSync } from 'fs'
import { join } from 'path'

export default defineConfig([
  // ESM build
  {
    entry: ['ts-src/**/*.ts'],
    format: ['esm'],
    outDir: 'dist-esm',
    sourcemap: true,
    dts: true,
    shims: true,
    bundle: false,
    splitting: false,
    clean: true,
    target: 'es2022',
    outExtension: () => ({ js: '.js' }),
    esbuildOptions(options) {
      options.packages = 'external'
    },
    async onSuccess() {
      // Create package.json for ESM
      const packageJson = {
        type: 'module',
      }
      writeFileSync(
        join('dist-esm', 'package.json'),
        JSON.stringify(packageJson, null, 2),
      )
    },
  },
  // CJS build
  {
    entry: ['ts-src/**/*.ts'],
    format: ['cjs'],
    outDir: 'dist-cjs',
    sourcemap: true,
    dts: {
      resolve: true,
    },
    shims: true,
    bundle: false,
    splitting: false,
    target: 'es2022',
    outExtension: () => ({ js: '.js', dts: '.d.cts' }),
    esbuildOptions(options) {
      options.packages = 'external'
    },
    async onSuccess() {
      // Create package.json for CJS
      const packageJson = {
        type: 'commonjs',
      }
      writeFileSync(
        join('dist-cjs', 'package.json'),
        JSON.stringify(packageJson, null, 2),
      )
    },
  },
])
