import { deprecate } from 'util'
import { JT400 } from '../java/JT400.js'
import { createBaseConnection } from './baseConnection.js'
import {
  Connection,
  DataQReadOptions,
  JustNameMessageQ,
  MessageFileHandlerOptions,
  MessageFileReadOptions,
  MessageQOptions,
  MessageQReadOptions,
  PgmParamType,
  ProgramDefinitionOptions,
} from './connection.types.js'
import { handleError } from './handleError.js'
import { ifs as createIfs } from './ifs/index.js'
import { CreateInsertList } from './insertList.js'
import { JdbcStream } from './jdbcstream.js'
import JSONStream from 'JSONStream'
import { Logger } from './logger.js'

const isJustNameMessageQ = function (
  opt: MessageQOptions,
): opt is JustNameMessageQ {
  return (opt as JustNameMessageQ).name !== undefined
}

export function createConnection({
  connection,
  insertListFun,
  inMemory,
  logger,
}: {
  connection: JT400
  insertListFun: CreateInsertList
  inMemory: boolean
  logger: Logger
}): Connection {
  const baseConnection = createBaseConnection(
    connection,
    insertListFun,
    logger,
    inMemory,
  )
  const jt400: Connection = {
    ...baseConnection,
    async transaction(transactionFunction) {
      const t = connection.createTransactionSync()
      const transactionContext = createBaseConnection(
        t,
        insertListFun,
        logger,
        inMemory,
      )

      try {
        const res = await transactionFunction(transactionContext)
        await t.commit()
        return res
      } catch (err) {
        await t.rollback()
        throw err
      } finally {
        await t.end()
      }
    },
    getTablesAsStream(opt) {
      return new JdbcStream({
        jdbcStream: connection.getTablesAsStreamSync(
          opt.catalog,
          opt.schema,
          opt.table || '%',
        ),
      }).pipe(JSONStream.parse([true]))
    },
    getColumns(opt) {
      return connection
        .getColumns(opt.catalog, opt.schema, opt.table, opt.columns || '%')
        .then(JSON.parse)
    },
    getPrimaryKeys(opt) {
      return connection
        .getPrimaryKeys(opt.catalog, opt.schema, opt.table)
        .then(JSON.parse)
    },
    async openMessageQ(opt) {
      const hasPath = !isJustNameMessageQ(opt)
      const name = isJustNameMessageQ(opt) ? opt.name : opt.path
      const dq = await connection.openMessageQ(name, hasPath)
      return {
        read(params?: MessageQReadOptions) {
          const wait = params?.wait ?? -1
          return dq.read(wait).then((json) => json ? JSON.parse(json) : null)
        },
        sendInformational(messageText) {
          return dq.sendInformational(messageText)
        },
      }
    },
    createKeyedDataQ(opt) {
      const dq = connection.createKeyedDataQSync(opt.name)
      const readRes = async (key: string, wait: number, writeKeyLength: number) => {
        const res = await dq.readResponse(key, wait, writeKeyLength)
        const data = await res.getData()
        return {
          data,
          write: (data: string) => res.write(data),
        }
      }
      return {
        write(key, data) {
          return dq.write(key, data)
        },
        read(params: DataQReadOptions | string) {
          if (typeof params === 'string') {
            return dq.read(params, -1)
          }
          const { key, wait = -1, writeKeyLength } = params
          return writeKeyLength
            ? readRes(key, wait, writeKeyLength)
            : dq.read(key, wait)
        },
      }
    },
    async openMessageFile(opt: MessageFileHandlerOptions) {
      const messageFile = await connection.openMessageFile(opt.path)
      return {
        read(params: MessageFileReadOptions) {
          return messageFile.read(params.messageId)
        },
      }
    },
    ifs() {
      return createIfs(connection)
    },
    defineProgram(opt: ProgramDefinitionOptions) {
      const pgm = connection.pgmSync(
        opt.programName,
        JSON.stringify(opt.paramsSchema),
        opt.libraryName || '*LIBL',
        opt.ccsid,
      )
      return function run(params, timeout = 3) {
        return pgm
          .run(JSON.stringify(params), timeout)
          .then(JSON.parse)
          .catch(handleError({ programName: opt.programName, params, timeout }))
      }
    },
    pgm: deprecate(function (programName: string, paramsSchema: PgmParamType[], libraryName?: string) {
      return jt400.defineProgram({
        programName,
        paramsSchema,
        libraryName,
      })
    }, 'pgm function is deprecated and will be removed in version 7.0. Please use defineProgram.'),
    close() {
      return connection.close()
    },
  }

  return jt400
}
