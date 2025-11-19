"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initJavaBridge = void 0;
const java_bridge_1 = require("java-bridge");
const path_1 = require("path");
const initJavaBridge = () => {
    const JAR_DIR = (0, path_1.join)(__dirname, '/../../java/lib');
    (0, java_bridge_1.appendClasspath)([
        (0, path_1.join)(JAR_DIR, 'jt400.jar'),
        (0, path_1.join)(JAR_DIR, 'jt400wrap.jar'),
        (0, path_1.join)(JAR_DIR, 'json-simple-1.1.1.jar'),
        (0, path_1.join)(JAR_DIR, 'hsqldb.jar'),
    ]);
    (0, java_bridge_1.ensureJvm)({
        opts: [
            '-Xrs',
            '-Dcom.ibm.as400.access.AS400.guiAvailable=false',
            '--enable-native-access=ALL-UNNAMED',
        ],
    });
    const JT400Class = (0, java_bridge_1.importClass)('nodejt400.JT400');
    const HsqlClientClass = (0, java_bridge_1.importClass)('nodejt400.HsqlClient');
    return {
        createConnection: (config) => JT400Class.createConnection(config),
        createPool: (config) => JT400Class.createPoolSync(config),
        createInMemoryConnection: () => {
            const instance = new HsqlClientClass();
            return instance;
        },
    };
};
exports.initJavaBridge = initJavaBridge;
//# sourceMappingURL=index.js.map