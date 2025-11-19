"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBaseConnection = void 0;
const JSONStream_1 = require("JSONStream");
const handleError_1 = require("./handleError");
const jdbcstream_1 = require("./jdbcstream");
const jdbcwritestream_1 = require("./jdbcwritestream");
const streamTransformers_1 = require("./streamTransformers");
function convertDateValues(v) {
    return v instanceof Date
        ? v.toISOString().replace('T', ' ').replace('Z', '')
        : v;
}
function paramsToJson(params) {
    return JSON.stringify((params || []).map(convertDateValues));
}
const createBaseConnection = function (jdbcConnection, insertListFun, logger, inMemory) {
    const baseConnection = {
        query(sql, params = [], options) {
            const jsonParams = paramsToJson(params);
            const trim = options && options.trim !== undefined ? options.trim : true;
            logger.debug({ sql, state: 'starting', parameterCount: params.length }, 'Executing IBMI DB query');
            const startTime = process.hrtime.bigint();
            return jdbcConnection
                .query(sql, jsonParams, trim)
                .then(JSON.parse)
                .then((result) => {
                logger.info({
                    sql,
                    state: 'finished',
                    duration: Number(process.hrtime.bigint() - startTime),
                    parameterCount: params.length,
                    resultSize: result.length,
                }, 'IBMI DB query executed');
                return result;
            })
                .catch((0, handleError_1.handleError)({ sql, params }));
        },
        createReadStream(sql, params = []) {
            const jsonParams = paramsToJson(params);
            logger.debug({ sql, state: 'starting', parameterCount: params.length }, 'Executing IBMI DB query as stream');
            const startTime = process.hrtime.bigint();
            const stream = new jdbcstream_1.JdbcStream({
                jdbcStreamPromise: jdbcConnection
                    .queryAsStream(sql, jsonParams, 100)
                    .catch((0, handleError_1.handleError)({ sql, params })),
            });
            stream.on('end', () => {
                logger.info({
                    sql,
                    state: 'finished',
                    duration: Number(process.hrtime.bigint() - startTime),
                    parameterCount: params.length,
                }, 'IBMI DB query as stream ended');
            });
            return stream;
        },
        execute(sql, params = []) {
            const jsonParams = paramsToJson(params);
            logger.debug({ sql, state: 'starting', parameterCount: params.length }, 'Executing IBMI DB sql statement');
            return jdbcConnection
                .execute(sql, jsonParams)
                .then((statement) => {
                const isQuery = statement.isQuerySync();
                let stream;
                const stWrap = {
                    isQuery() {
                        return isQuery;
                    },
                    metadata() {
                        return statement.getMetaData().then(JSON.parse);
                    },
                    asArray() {
                        const startTime = process.hrtime.bigint();
                        return statement
                            .asArray()
                            .then(JSON.parse)
                            .then((result) => {
                            logger.info({
                                sql,
                                state: 'finished',
                                duration: Number(process.hrtime.bigint() - startTime),
                                parameterCount: params.length,
                                resultSize: result.length,
                            }, 'IBMI DB query executed');
                            return result;
                        });
                    },
                    asStream(options) {
                        const startTime = process.hrtime.bigint();
                        options = options || {};
                        stream = new jdbcstream_1.JdbcStream({
                            jdbcStream: statement.asStreamSync(options.bufferSize || 100),
                        });
                        stream.on('end', () => {
                            logger.info({
                                sql,
                                state: 'finished',
                                duration: Number(process.hrtime.bigint() - startTime),
                                parameterCount: params.length,
                            }, 'IBMI DB query as stream ended');
                        });
                        return stream;
                    },
                    asObjectStream(options) {
                        const startTime = process.hrtime.bigint();
                        options = options || {};
                        const parseJSON = (0, JSONStream_1.parse)('*');
                        return statement
                            .getMetaData()
                            .then(JSON.parse)
                            .then((metadata) => {
                            const transformArrayToObject = (0, streamTransformers_1.arrayToObject)(metadata);
                            stream = new jdbcstream_1.JdbcStream({
                                jdbcStream: statement.asStreamSync(options.bufferSize || 100),
                            });
                            stream.on('end', () => {
                                logger.info({
                                    sql,
                                    state: 'finished',
                                    duration: Number(process.hrtime.bigint() - startTime),
                                    parameterCount: params.length,
                                }, 'IBMI DB query as object stream ended');
                            });
                            return stream.pipe(parseJSON).pipe(transformArrayToObject);
                        });
                    },
                    asIterable() {
                        const startTime = process.hrtime.bigint();
                        return {
                            [Symbol.asyncIterator]() {
                                return {
                                    next() {
                                        return __awaiter(this, void 0, void 0, function* () {
                                            return statement
                                                .next()
                                                .then(JSON.parse)
                                                .then((value) => {
                                                const done = !Boolean(value);
                                                if (done) {
                                                    logger.info({
                                                        sql,
                                                        state: 'finished',
                                                        duration: Number(process.hrtime.bigint() - startTime),
                                                        parameterCount: jsonParams.length,
                                                    }, 'IBMI DB query as iterable executed');
                                                }
                                                return {
                                                    done,
                                                    value,
                                                };
                                            });
                                        });
                                    },
                                };
                            },
                        };
                    },
                    updated() {
                        return statement.updated();
                    },
                    close() {
                        if (stream) {
                            stream.close();
                        }
                        else {
                            return statement.close();
                        }
                    },
                };
                return stWrap;
            })
                .catch((0, handleError_1.handleError)({ sql, params }));
        },
        update(sql, params = []) {
            const jsonParams = paramsToJson(params);
            logger.info({ sql, state: 'starting', parameterCount: params.length }, 'Executing IBMI DB update');
            const startTime = process.hrtime.bigint();
            return jdbcConnection
                .update(sql, jsonParams)
                .then((result) => {
                logger.info({
                    sql,
                    state: 'finished',
                    duration: Number(process.hrtime.bigint() - startTime),
                    parameterCount: params.length,
                    result: result,
                }, 'IBMI DB update executed');
                return result;
            })
                .catch((0, handleError_1.handleError)({ sql, params }));
        },
        createWriteStream(sql, options) {
            logger.debug({ sql, state: 'starting' }, 'Executing IBMI DB write stream');
            const startTime = process.hrtime.bigint();
            const stream = (0, jdbcwritestream_1.createJdbcWriteStream)(baseConnection.batchUpdate, sql, options && options.bufferSize);
            stream.on('finish', () => {
                logger.info({
                    sql,
                    state: 'finished',
                    duration: Number(process.hrtime.bigint() - startTime),
                }, 'IBMI DB write stream ended');
            });
            return stream;
        },
        batchUpdate(sql, paramsList) {
            const params = (paramsList || []).map((row) => {
                return row.map(convertDateValues);
            });
            const jsonParams = JSON.stringify(params);
            logger.info({ sql, state: 'starting', parameterCount: params.length }, 'Executing IBMI DB batch update');
            const startTime = process.hrtime.bigint();
            return jdbcConnection
                .batchUpdate(sql, jsonParams)
                .then((res) => {
                const result = Array.from(res);
                logger.info({
                    sql,
                    state: 'finished',
                    duration: Number(process.hrtime.bigint() - startTime),
                    parameterCount: params.length,
                    result: result,
                }, 'IBMI DB batch update executed');
                return result;
            })
                .catch((0, handleError_1.handleError)({ sql, params }));
        },
        insertAndGetId(sql, params = []) {
            const jsonParams = paramsToJson(params);
            logger.info({ sql, state: 'starting', parameterCount: params.length }, 'Executing IBMI DB insert and get id');
            const startTime = process.hrtime.bigint();
            return jdbcConnection
                .insertAndGetId(sql, jsonParams)
                .then((result) => {
                logger.info({
                    sql,
                    state: 'finished',
                    duration: Number(process.hrtime.bigint() - startTime),
                    parameterCount: params.length,
                }, 'IBMI DB insert and get id executed');
                return result;
            })
                .catch((0, handleError_1.handleError)({ sql, params }));
        },
        insertList(tableName, idColumn, list) {
            return insertListFun(baseConnection)(tableName, idColumn, list);
        },
        isInMemory() {
            return inMemory;
        },
    };
    return baseConnection;
};
exports.createBaseConnection = createBaseConnection;
//# sourceMappingURL=baseConnection.js.map