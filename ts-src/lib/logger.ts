export interface Logger {
  debug: (message: unknown, ...args: unknown[]) => void
  info: (message: unknown, ...args: unknown[]) => void
  warn: (message: unknown, ...args: unknown[]) => void
  error: (message: unknown, ...args: unknown[]) => void
}

export const createDefaultLogger = (): Logger => {
  // Default logger that does nothing
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  }
}
