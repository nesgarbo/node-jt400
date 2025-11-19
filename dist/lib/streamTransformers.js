"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrayToObject = arrayToObject;
const stream_1 = require("stream");
function arrayToObject(metadata) {
    const columnNames = metadata.map((md) => md.name);
    const transformer = new stream_1.Transform({
        objectMode: true,
        transform(chunk, _, callback) {
            try {
                if (!Array.isArray(chunk)) {
                    return callback(new Error('Expected an array chunk as input'));
                }
                if (chunk.length !== columnNames.length) {
                    return callback(new Error(`Array chunk length ${chunk.length} does not match columns length ${columnNames.length}`));
                }
                const obj = {};
                for (let i = 0; i < columnNames.length; i++) {
                    obj[columnNames[i]] = chunk[i];
                }
                callback(null, obj);
            }
            catch (err) {
                callback(err);
            }
        },
    });
    return transformer;
}
//# sourceMappingURL=streamTransformers.js.map