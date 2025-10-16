import { dirname } from 'path'
import { fileURLToPath } from 'url'

/**
 * Get the current directory in a way that works for both ESM and CommonJS
 */
export function getCurrentDir(): string {
    try {
        // Try ESM first
        const importMeta = eval('import.meta')
        if (importMeta && importMeta.url) {
            return dirname(fileURLToPath(importMeta.url))
        }
    } catch {
        // Fall through to CommonJS
    }

    try {
        // Try CommonJS
        return eval('__dirname')
    } catch {
        // Final fallback
        return process.cwd()
    }
}

/**
 * Get the current file URL/path in a way that works for both ESM and CommonJS
 */
export function getCurrentFile(): string {
    try {
        // Try ESM first
        const importMeta = eval('import.meta')
        if (importMeta && importMeta.url) {
            return fileURLToPath(importMeta.url)
        }
    } catch {
        // Fall through to CommonJS
    }

    try {
        // Try CommonJS
        return eval('__filename')
    } catch {
        // Final fallback
        return process.cwd()
    }
}