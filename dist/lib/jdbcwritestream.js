"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJdbcWriteStream = createJdbcWriteStream;
const FlushWritable = require("flushwritable");
function createJdbcWriteStream(batchUpdate, statement, bufferSize) {
    bufferSize = bufferSize || 100;
    let ws = new FlushWritable({ objectMode: true });
    let dataBuffer = [];
    function flush(done) {
        const d = dataBuffer;
        dataBuffer = [];
        batchUpdate(statement, d)
            .then(() => {
            done();
        })
            .catch(done);
    }
    ws._write = function (chunck, _, next) {
        dataBuffer.push(chunck);
        if (dataBuffer.length >= bufferSize) {
            flush(next);
        }
        else {
            next();
        }
    };
    ws._flush = function (done) {
        if (dataBuffer.length) {
            flush(done);
        }
        else {
            done();
        }
    };
    return ws;
}
//# sourceMappingURL=jdbcwritestream.js.map