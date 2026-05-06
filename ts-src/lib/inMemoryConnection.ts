import { JavaBridge } from '../java/index.js'
import { createConnection } from './connection.js'
import { Connection } from './connection.types.js'
import { createStandardInsertList } from './insertList.js'
import { Logger } from './logger.js'

export interface InMemoryConnection extends Connection {
  mockPgm: (programName: string, fn: (input: Record<string, unknown>, timeout?: number) => unknown) => InMemoryConnection
}

export function createInMemoryConnection(
  jt400Factory: JavaBridge,
  logger: Logger,
): InMemoryConnection {
  const javaCon = jt400Factory.createInMemoryConnection()
  const instance = createConnection({
    connection: javaCon,
    insertListFun: createStandardInsertList,
    logger,
    inMemory: true,
  })
  const pgmMockRegistry: Record<string, (input: Record<string, unknown>, timeout?: number) => unknown> = {}

  const defaultPgm = instance.defineProgram
  instance.defineProgram = function (opt) {
    const defaultFunc = defaultPgm(opt)
    return function (params, timeout = 3) {
      const mockFunc = pgmMockRegistry[opt.programName]

      if (mockFunc) {
        const res = mockFunc(params, timeout)
        return (typeof (res as Promise<unknown>).then === 'function')
          ? (res as Promise<unknown>)
          : Promise.resolve(res)
      }

      return defaultFunc(params, timeout)
    }
  }
  const inMemoryConnection: InMemoryConnection = {
    ...instance,
    mockPgm(programName, func) {
      pgmMockRegistry[programName] = func
      return inMemoryConnection
    },
  }
  return inMemoryConnection
}
