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
exports.createConnection = createConnection;
const util_1 = require("util");
const baseConnection_1 = require("./baseConnection");
const handleError_1 = require("./handleError");
const ifs_1 = require("./ifs");
const jdbcstream_1 = require("./jdbcstream");
const JSONStream = require("JSONStream");
const isJustNameMessageQ = function (opt) {
    return opt.name !== undefined;
};
function createConnection({ connection, insertListFun, inMemory, logger, }) {
    const baseConnection = (0, baseConnection_1.createBaseConnection)(connection, insertListFun, logger, inMemory);
    const jt400 = Object.assign(Object.assign({}, baseConnection), { transaction(transactionFunction) {
            return __awaiter(this, void 0, void 0, function* () {
                const t = connection.createTransactionSync();
                const transactionContext = (0, baseConnection_1.createBaseConnection)(t, insertListFun, logger, inMemory);
                try {
                    const res = yield transactionFunction(transactionContext);
                    yield t.commit();
                    return res;
                }
                catch (err) {
                    yield t.rollback();
                    throw err;
                }
                finally {
                    yield t.end();
                }
            });
        },
        getTablesAsStream(opt) {
            return new jdbcstream_1.JdbcStream({
                jdbcStream: connection.getTablesAsStreamSync(opt.catalog, opt.schema, opt.table || '%'),
            }).pipe(JSONStream.parse([true]));
        },
        getColumns(opt) {
            return connection
                .getColumns(opt.catalog, opt.schema, opt.table, opt.columns || '%')
                .then(JSON.parse);
        },
        getPrimaryKeys(opt) {
            return connection
                .getPrimaryKeys(opt.catalog, opt.schema, opt.table)
                .then(JSON.parse);
        },
        openMessageQ(opt) {
            return __awaiter(this, void 0, void 0, function* () {
                const hasPath = !isJustNameMessageQ(opt);
                const name = isJustNameMessageQ(opt) ? opt.name : opt.path;
                const dq = yield connection.openMessageQ(name, hasPath);
                return {
                    read() {
                        let wait = -1;
                        if (arguments[0] === Object(arguments[0])) {
                            wait = arguments[0].wait || wait;
                        }
                        return dq.read(wait);
                    },
                    sendInformational(messageText) {
                        return dq.sendInformational(messageText);
                    },
                };
            });
        },
        createKeyedDataQ(opt) {
            const dq = connection.createKeyedDataQSync(opt.name);
            const readRes = function (key, wait, writeKeyLength) {
                return __awaiter(this, void 0, void 0, function* () {
                    const res = yield dq.readResponse(key, wait, writeKeyLength);
                    const data = yield res.getData();
                    return {
                        data,
                        write: (data) => res.write(data),
                    };
                });
            };
            return {
                write(key, data) {
                    return dq.write(key, data);
                },
                read() {
                    let wait = -1;
                    let key;
                    let writeKeyLength;
                    if (arguments[0] === Object(arguments[0])) {
                        key = arguments[0].key;
                        wait = arguments[0].wait || wait;
                        writeKeyLength = arguments[0].writeKeyLength;
                    }
                    else {
                        key = arguments[0];
                    }
                    return writeKeyLength
                        ? readRes(key, wait, writeKeyLength)
                        : dq.read(key, wait);
                },
            };
        },
        openMessageFile(opt) {
            return __awaiter(this, void 0, void 0, function* () {
                const messageFile = yield connection.openMessageFile(opt.path);
                return {
                    read() {
                        const messageId = arguments[0].messageId;
                        return messageFile.read(messageId);
                    },
                };
            });
        },
        ifs() {
            return (0, ifs_1.ifs)(connection);
        },
        defineProgram(opt) {
            const pgm = connection.pgmSync(opt.programName, JSON.stringify(opt.paramsSchema), opt.libraryName || '*LIBL', opt.ccsid);
            return function run(params, timeout = 3) {
                return pgm
                    .run(JSON.stringify(params), timeout)
                    .then(JSON.parse)
                    .catch((0, handleError_1.handleError)({ programName: opt.programName, params, timeout }));
            };
        }, pgm: (0, util_1.deprecate)(function (programName, paramsSchema, libraryName) {
            return this.defineProgram({
                programName,
                paramsSchema,
                libraryName,
            });
        }, 'pgm function is deprecated and will be removed in version 5.0. Please use defineProgram.'), close() {
            return connection.close();
        } });
    return jt400;
}
//# sourceMappingURL=connection.js.map