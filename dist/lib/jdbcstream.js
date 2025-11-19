"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JdbcStream = JdbcStream;
const util_1 = require("util");
const stream_1 = require("stream");
function JdbcStream(opt) {
    stream_1.Readable.call(this, { objectMode: false });
    this._jdbcStream = opt.jdbcStream;
    this._jdbcStreamPromise = opt.jdbcStreamPromise;
}
(0, util_1.inherits)(JdbcStream, stream_1.Readable);
function read(context) {
    if (context._closed) {
        context._jdbcStream.close().catch((err) => {
            if (err) {
                context.emit('error', err);
            }
        });
        context.push(null);
    }
    else {
        context._jdbcStream
            .read()
            .then((res) => {
            context.push(res);
        })
            .catch((err) => {
            context.emit('error', err);
        });
    }
}
JdbcStream.prototype.close = function () {
    this._closed = true;
};
JdbcStream.prototype._read = function () {
    if (!this._jdbcStream) {
        this._jdbcStreamPromise
            .then((stream) => {
            this._jdbcStream = stream;
            read(this);
        })
            .catch((err) => {
            this.emit('error', err);
        });
    }
    else {
        read(this);
    }
};
//# sourceMappingURL=jdbcstream.js.map