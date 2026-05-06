import { parse } from 'JSONStream'
import { JDBCConnection, StatementWrap } from '../java/JT400.js'
import { BaseConnection, Param, Statement, StreamOptions } from './baseConnection.types.js'
import { handleError } from './handleError.js'
import { CreateInsertList } from './insertList.js'
import { JdbcStream } from './jdbcstream.js'
import { createJdbcWriteStream } from './jdbcwritestream.js'
import { Logger } from './logger.js'
import { arrayToObject } from './streamTransformers.js'

function convertDateValues(v: Param): Param {
  return v instanceof Date
    ? v.toISOString().replace('T', ' ').replace('Z', '')
    : v
}

function paramsToJson(params: Param[]) {
  return JSON.stringify((params || []).map(convertDateValues))
}

type LogContext = { sql: string; params: Param[]; logger: Logger }

function buildStatementWrapper(st: StatementWrap, ctx?: LogContext): Statement {
  let stream: JdbcStream | undefined

  return {
    prepare(sql: string) {
      return st.prepare(sql)
    },
    isQuery() {
      return st.isQuerySync()
    },
    async metadata() {
      return st.getMetaData().then(JSON.parse)
    },
    async asArray() {
      const startTime = ctx ? process.hrtime.bigint() : 0n
      return st.asArray().then(JSON.parse).then((result: unknown[]) => {
        if (ctx) {
          ctx.logger.info({
            sql: ctx.sql,
            state: 'finished',
            duration: Number(process.hrtime.bigint() - startTime),
            parameterCount: ctx.params.length,
            resultSize: result.length,
          }, 'IBMI DB query executed')
        }
        return result as string[][]
      })
    },
    asStream(options?: StreamOptions) {
      const startTime = ctx ? process.hrtime.bigint() : 0n
      stream = new JdbcStream({
        jdbcStream: st.asStreamSync(options?.bufferSize ?? 100),
      })
      if (ctx) {
        stream.on('end', () => {
          ctx.logger.info({
            sql: ctx.sql,
            state: 'finished',
            duration: Number(process.hrtime.bigint() - startTime),
            parameterCount: ctx.params.length,
          }, 'IBMI DB query as stream ended')
        })
      }
      return stream
    },
    asObjectStream(options?: StreamOptions) {
      const startTime = ctx ? process.hrtime.bigint() : 0n
      return st.getMetaData().then(JSON.parse).then((metadata) => {
        const transformArrayToObject = arrayToObject(metadata)
        const parseJSON = parse('*')
        stream = new JdbcStream({
          jdbcStream: st.asStreamSync(options?.bufferSize ?? 100),
        })
        if (ctx) {
          stream.on('end', () => {
            ctx.logger.info({
              sql: ctx.sql,
              state: 'finished',
              duration: Number(process.hrtime.bigint() - startTime),
              parameterCount: ctx.params.length,
            }, 'IBMI DB query as object stream ended')
          })
        }
        return stream.pipe(parseJSON).pipe(transformArrayToObject)
      })
    },
    asIterable() {
      const startTime = ctx ? process.hrtime.bigint() : 0n
      return {
        [Symbol.asyncIterator]() {
          return {
            async next() {
              return st.next().then(JSON.parse).then((value) => {
                const done = !value
                if (done && ctx) {
                  ctx.logger.info({
                    sql: ctx.sql,
                    state: 'finished',
                    duration: Number(process.hrtime.bigint() - startTime),
                    parameterCount: ctx.params.length,
                  }, 'IBMI DB query as iterable executed')
                }
                return { done, value }
              })
            },
          }
        },
      }
    },
    updated() {
      return st.updated()
    },
    close() {
      if (stream) {
        return stream.close()
      }
      return st.close()
    },
  }
}

export const createBaseConnection = function (
  jdbcConnection: JDBCConnection,
  insertListFun: CreateInsertList,
  logger: Logger,
  inMemory: boolean,
): BaseConnection {
  const baseConnection: BaseConnection = {
    async commit() {
      return jdbcConnection.commit().catch((err) => {
        throw handleError({})(err)
      })
    },
    async rollback() {
      return jdbcConnection.rollback().catch((err) => {
        throw handleError({})(err)
      })
    },
    async createStatement() {
      if (!jdbcConnection.createStatement) {
        throw new Error(
          'createStatement is not supported by this JDBCConnection',
        )
      }
      return jdbcConnection.createStatement().then((st) => buildStatementWrapper(st))
    },
    query(sql, params = [], options) {
      const jsonParams = paramsToJson(params)
      const trim = options?.trim !== undefined ? options.trim : true
      logger.debug(
        { sql, state: 'starting', parameterCount: params.length },
        'Executing IBMI DB query',
      )
      const startTime = process.hrtime.bigint()
      return jdbcConnection
        .query(sql, jsonParams, trim)
        .then(JSON.parse)
        .then((result: unknown[]) => {
          logger.info(
            {
              sql,
              state: 'finished',
              duration: Number(process.hrtime.bigint() - startTime),
              parameterCount: params.length,
              resultSize: result.length,
            },
            'IBMI DB query executed',
          )
          return result as never[]
        })
        .catch(handleError({ sql, params }))
    },

    createReadStream(sql, params = []) {
      const jsonParams = paramsToJson(params)
      logger.debug(
        { sql, state: 'starting', parameterCount: params.length },
        'Executing IBMI DB query as stream',
      )
      const startTime = process.hrtime.bigint()
      const stream = new JdbcStream({
        jdbcStreamPromise: jdbcConnection
          .queryAsStream(sql, jsonParams, 100)
          .catch(handleError({ sql, params })),
      })
      stream.on('end', () => {
        logger.info(
          {
            sql,
            state: 'finished',
            duration: Number(process.hrtime.bigint() - startTime),
            parameterCount: params.length,
          },
          'IBMI DB query as stream ended',
        )
      })
      return stream
    },

    execute(sql, params = []) {
      const jsonParams = paramsToJson(params)
      logger.debug(
        { sql, state: 'starting', parameterCount: params.length },
        'Executing IBMI DB sql statement',
      )
      return jdbcConnection
        .execute(sql, jsonParams)
        .then((st) => buildStatementWrapper(st, { sql, params, logger }))
        .catch(handleError({ sql, params }))
    },

    update(sql, params = []) {
      const jsonParams = paramsToJson(params)
      logger.info(
        { sql, state: 'starting', parameterCount: params.length },
        'Executing IBMI DB update',
      )
      const startTime = process.hrtime.bigint()
      return jdbcConnection
        .update(sql, jsonParams)
        .then((result) => {
          logger.info(
            {
              sql,
              state: 'finished',
              duration: Number(process.hrtime.bigint() - startTime),
              parameterCount: params.length,
              result,
            },
            'IBMI DB update executed',
          )
          return result
        })
        .catch(handleError({ sql, params }))
    },

    createWriteStream(sql, options) {
      logger.debug({ sql, state: 'starting' }, 'Executing IBMI DB write stream')
      const startTime = process.hrtime.bigint()
      const stream = createJdbcWriteStream(
        baseConnection.batchUpdate,
        sql,
        options?.bufferSize,
      )
      stream.on('finish', () => {
        logger.info(
          {
            sql,
            state: 'finished',
            duration: Number(process.hrtime.bigint() - startTime),
          },
          'IBMI DB write stream ended',
        )
      })
      return stream
    },

    batchUpdate(sql, paramsList) {
      if (!paramsList || paramsList.length === 0) {
        return Promise.resolve([])
      }
      const params = paramsList.map((row) => {
        return row.map(convertDateValues)
      })

      const jsonParams = JSON.stringify(params)
      logger.info(
        { sql, state: 'starting', parameterCount: params.length },
        'Executing IBMI DB batch update',
      )
      const startTime = process.hrtime.bigint()
      return jdbcConnection
        .batchUpdate(sql, jsonParams)
        .then((res) => {
          const result = Array.from(res)
          logger.info(
            {
              sql,
              state: 'finished',
              duration: Number(process.hrtime.bigint() - startTime),
              parameterCount: params.length,
              result,
            },
            'IBMI DB batch update executed',
          )
          return result
        })
        .catch(handleError({ sql, params }))
    },

    insertAndGetId(sql, params = []) {
      const jsonParams = paramsToJson(params)
      logger.info(
        { sql, state: 'starting', parameterCount: params.length },
        'Executing IBMI DB insert and get id',
      )
      const startTime = process.hrtime.bigint()
      return jdbcConnection
        .insertAndGetId(sql, jsonParams)
        .then((result) => {
          logger.info(
            {
              sql,
              state: 'finished',
              duration: Number(process.hrtime.bigint() - startTime),
              parameterCount: params.length,
            },
            'IBMI DB insert and get id executed',
          )
          return result
        })
        .catch(handleError({ sql, params }))
    },

    insertList(tableName, idColumn, list) {
      return insertListFun(baseConnection)(tableName, idColumn, list)
    },

    queryCursor<T>(sql: string, params: Param[] = []) {
      const jsonParams = paramsToJson(params)
      return (async function* () {
        const st = await jdbcConnection
          .execute(sql, jsonParams)
          .catch(handleError({ sql, params }))
        try {
          while (true) {
            const json = await st.next()
            if (!json) break
            const row: T = JSON.parse(json)
            if (row === null || row === undefined) break
            yield row
          }
        } finally {
          await st.close()
        }
      })() as AsyncIterable<T>
    },

    isInMemory() {
      return inMemory
    },
  }
  return baseConnection
}
