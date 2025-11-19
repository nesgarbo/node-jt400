"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInMemoryConnection = createInMemoryConnection;
const connection_1 = require("./connection");
const insertList_1 = require("./insertList");
function createInMemoryConnection(jt400Factory, logger) {
    const javaCon = jt400Factory.createInMemoryConnection();
    const instance = (0, connection_1.createConnection)({
        connection: javaCon,
        insertListFun: insertList_1.createStandardInsertList,
        logger,
        inMemory: true,
    });
    const pgmMockRegistry = {};
    const defaultPgm = instance.defineProgram;
    instance.defineProgram = function (opt) {
        const defaultFunc = defaultPgm(opt);
        return function (params, timeout = 3) {
            const mockFunc = pgmMockRegistry[opt.programName];
            if (mockFunc) {
                const res = mockFunc(params, timeout);
                return res.then ? res : Promise.resolve(res);
            }
            return defaultFunc(params, timeout);
        };
    };
    const inMemoryconnection = Object.assign(Object.assign({}, instance), { mockPgm(programName, func) {
            pgmMockRegistry[programName] = func;
            return inMemoryconnection;
        } });
    return inMemoryconnection;
}
//# sourceMappingURL=inMemoryConnection.js.map