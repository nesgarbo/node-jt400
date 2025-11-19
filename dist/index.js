"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.pool = pool;
exports.connect = connect;
exports.useInMemoryDb = useInMemoryDb;
const java_1 = require("./java");
const connection_1 = require("./lib/connection");
const inMemoryConnection_1 = require("./lib/inMemoryConnection");
const insertList_1 = require("./lib/insertList");
const logger_1 = require("./lib/logger");
__exportStar(require("./lib/baseConnection.types"), exports);
__exportStar(require("./lib/connection.types"), exports);
__exportStar(require("./lib/ifs/types"), exports);
const defaultConfig = {
    host: process.env.AS400_HOST,
    user: process.env.AS400_USERNAME,
    password: process.env.AS400_PASSWORD,
    naming: 'system',
};
const javaBridge = (0, java_1.initJavaBridge)();
function pool(config = {}, options = {}) {
    const javaCon = javaBridge.createPool(JSON.stringify(Object.assign(Object.assign({}, defaultConfig), config)));
    return (0, connection_1.createConnection)({
        connection: javaCon,
        insertListFun: insertList_1.createInsertListInOneStatment,
        logger: options.logger || (0, logger_1.createDefaultLogger)(),
        inMemory: false,
    });
}
function connect() {
    return __awaiter(this, arguments, void 0, function* (config = {}, options = {}) {
        const javaCon = yield javaBridge.createConnection(JSON.stringify(Object.assign(Object.assign({}, defaultConfig), config)));
        return (0, connection_1.createConnection)({
            connection: javaCon,
            insertListFun: insertList_1.createInsertListInOneStatment,
            logger: options.logger || (0, logger_1.createDefaultLogger)(),
            inMemory: false,
        });
    });
}
function useInMemoryDb(options = {}) {
    return (0, inMemoryConnection_1.createInMemoryConnection)(javaBridge, options.logger || (0, logger_1.createDefaultLogger)());
}
//# sourceMappingURL=index.js.map