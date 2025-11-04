import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

// Store the module URL at load time
// This works by creating a new Error and parsing the stack trace
// In ESM, the stack trace contains file:// URLs, in CommonJS it contains file paths
let moduleDir: string | undefined

function initModuleDir(): string {
  if (moduleDir) {
    return moduleDir
  }

  // Try CommonJS __dirname first (most reliable when available)
  try {
    // eslint-disable-next-line no-eval
    const dir = eval('typeof __dirname !== "undefined" ? __dirname : null')
    if (dir) {
      moduleDir = dir
      return dir
    }
  } catch {
    // Not in CommonJS
  }

  // For ESM: Use stack trace to find this file's location
  try {
    const stack = new Error().stack
    if (stack) {
      // Look for file:// URLs in the stack
      const fileUrlMatch = stack.match(/file:\/\/[^\s):]+/g)
      if (fileUrlMatch) {
        for (const url of fileUrlMatch) {
          // Find the one that points to pathUtils
          if (url.includes('pathUtils')) {
            // Remove line:column if present
            let cleanUrl = url.split(':').slice(0, 3).join(':')
            // Source maps may add /ts-src/ to the path, remove it
            // e.g., /dist/esm/lib/ts-src/lib/pathUtils.ts -> /dist/esm/lib/pathUtils.js
            cleanUrl = cleanUrl.replace(/\/ts-src\/[^/]+\//, '/')
            // Also change .ts extension to .js if present (from source maps)
            cleanUrl = cleanUrl.replace(/\.ts$/, '.js')
            const dir = dirname(fileURLToPath(cleanUrl))
            moduleDir = dir
            return dir
          }
        }
      }
    }
  } catch {
    // Stack parsing failed
  }

  // Last resort fallback
  const fallback = process.cwd()
  moduleDir = fallback
  return fallback
}

/**
 * Get the directory where this module file is located
 * Works for both ESM and CommonJS
 */
function getModuleDir(): string {
  return initModuleDir()
}

/**
 * Find the package root directory by looking for java/lib/jt400.jar
 * This works whether the module is used directly or as a dependency
 */
export function getCurrentDir(): string {
  const currentDir = getModuleDir()

  // List of possible paths from different locations in the built package
  const possiblePaths = [
    currentDir, // Already at package root (shouldn't happen in dist)
    join(currentDir, '..'), // dist/esm/ or dist/cjs/
    join(currentDir, '../..'), // dist/esm/lib/ or dist/esm/java/
    join(currentDir, '../../..'), // dist/esm/unit-test/ or dist/esm/integration-test/
  ]

  for (const testPath of possiblePaths) {
    const resolvedPath = resolve(testPath)
    const javaLibPath = join(resolvedPath, 'java/lib/jt400.jar')
    if (existsSync(javaLibPath)) {
      return resolvedPath
    }
  }

  // Fallback: use current directory (will likely fail but provides better error message)
  throw new Error(
    `Could not locate package root with java/lib/jt400.jar. Searched from: ${currentDir}. Tried paths: ${possiblePaths.map((p) => resolve(p)).join(', ')}`,
  )
}
