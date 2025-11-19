"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IfsReadStream = IfsReadStream;
const util = require("util");
const stream_1 = require("stream");
function IfsReadStream(opt) {
    stream_1.Readable.call(this, { objectMode: false });
    this._ifsReadStream = opt.ifsReadStream;
}
util.inherits(IfsReadStream, stream_1.Readable);
IfsReadStream.prototype._read = function () {
    const streamPromise = this._ifsReadStream;
    streamPromise
        .then((stream) => stream.read().then((res) => {
        if (res == null) {
            this.push(null);
            return;
        }
        const buf = Buffer.isBuffer(res) ? res : res instanceof Uint8Array ? Buffer.from(res) : Buffer.from(res);
        if (buf.length === 0) {
            this.push(null);
            return;
        }
        this.push(buf);
    }))
        .catch((err) => this.emit('error', err));
};
//# sourceMappingURL=read_stream.js.map