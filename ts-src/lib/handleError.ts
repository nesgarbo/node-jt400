import { Oops } from 'oops-error'

type JavaBridgeError = {
  message?: string
  cause?: { getMessageSync?: () => string }
  getMessageSync?: () => string
}

export function handleError(context: Record<string, unknown>) {
  return (err: unknown) => {
    const e = err as JavaBridgeError
    const errMsg: string =
      e.cause?.getMessageSync?.() ??
      e.getMessageSync?.() ??
      e.message ??
      String(err)
    const start = errMsg.indexOf(': ')
    const end = errMsg.indexOf('\n')
    const message = start > 0 && end > 0 ? errMsg.slice(start + 2, end) : errMsg
    const category =
      message.toLowerCase().includes('connection') ||
      errMsg.includes('java.net.UnknownHostException')
        ? 'OperationalError'
        : 'ProgrammerError'
    throw new Oops({
      message,
      context,
      category,
      cause: err instanceof Error ? err : new Error(String(err)),
    })
  }
}
