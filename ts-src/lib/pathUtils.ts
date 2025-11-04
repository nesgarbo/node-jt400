import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

/**
 * Get the directory where this module file is located
 * Works for both ESM and CommonJS
 *
 * In ESM: Uses import.meta.url (accessed via eval to avoid TypeScript errors)
 * In CommonJS: Uses __dirname (injected by Node.js)
 */
function getModuleDir(): string {
  try {
    // ESM: Access import.meta.url
    // eslint-disable-next-line no-eval
    const metaUrl = eval(
      'typeof import !== "undefined" && import.meta && import.meta.url',
    )
    if (metaUrl) {
      return dirname(fileURLToPath(metaUrl))
    }
  } catch {
    // Not in ESM context
  }

  try {
    // CommonJS: Access __dirname
    // eslint-disable-next-line no-eval
    const dir = eval('typeof __dirname !== "undefined" ? __dirname : null')
    if (dir) {
      return dir
    }
  } catch {
    // Not in CommonJS context
  }

  // Final fallback - shouldn't happen in normal usage
  return process.cwd()
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
