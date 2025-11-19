"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IfsWriteStream = IfsWriteStream;
const util = require("util");
const FlushWritable = require("flushwritable");
function IfsWriteStream(opt) {
    FlushWritable.call(this, { objectMode: false });
    this._ifsWriteStream = opt.ifsWriteStream;
}
util.inherits(IfsWriteStream, FlushWritable);
IfsWriteStream.prototype._write = function (chunk, _, next) {
    const writeStream = this._ifsWriteStream;
    writeStream
        .then((stream) => stream.write(chunk))
        .then(() => next())
        .catch((err) => this.emit('error', err));
};
IfsWriteStream.prototype._flush = function (done) {
    const writeStream = this._ifsWriteStream;
    writeStream
        .then((stream) => stream.flush())
        .then(() => done())
        .catch((err) => done(err));
};
//# sourceMappingURL=write_stream.js.map