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
exports.ifs = ifs;
const path_1 = require("path");
const read_stream_1 = require("./read_stream");
const write_stream_1 = require("./write_stream");
function ifs(connection) {
    return {
        createReadStream: function (fileName) {
            const javaStream = Promise.resolve(fileName).then(function (file) {
                return connection.createIfsReadStream(file);
            });
            return new read_stream_1.IfsReadStream({
                ifsReadStream: javaStream
            });
        },
        createWriteStream: function (fileName, options = { append: false }) {
            const javaStream = Promise.resolve(fileName).then(function (file) {
                const folderPath = (0, path_1.dirname)(file);
                const fileName = (0, path_1.basename)(file);
                return connection.createIfsWriteStream(folderPath, fileName, options.append, options.ccsid);
            });
            return new write_stream_1.IfsWriteStream({
                ifsWriteStream: javaStream
            });
        },
        listFiles: (folderName) => __awaiter(this, void 0, void 0, function* () {
            const files = yield connection.listIfsFiles(folderName);
            return files || [];
        }),
        moveFile: (fileName, newFileName) => connection.moveIfsFile(fileName, newFileName),
        deleteFile: (fileName) => connection.deleteIfsFile(fileName),
        fileMetadata: (fileName) => connection.getIfsFileMetadata(fileName).then(JSON.parse),
    };
}
//# sourceMappingURL=index.js.map