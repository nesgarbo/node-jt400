import { IfsWriteStream as IfsWriteStreamType } from '../../java/JT400'
import util = require('util')
import FlushWritable = require('flushwritable')

type Opt = {
  ifsWriteStream: Promise<IfsWriteStreamType>
}

export function IfsWriteStream(opt: Opt) {
  FlushWritable.call(this, { objectMode: false })
  this._ifsWriteStream = opt.ifsWriteStream
}

util.inherits(IfsWriteStream, FlushWritable)

IfsWriteStream.prototype._write = function (
  chunk: Buffer,
  _: any,
  next: (err?: any) => void
) {
  const writeStream: Promise<IfsWriteStreamType> = this._ifsWriteStream
  writeStream
    .then((stream) => stream.write(chunk)) // Buffer -> byte[] (auto por java-bridge)
    .then(() => next())
    .catch((err) => this.emit('error', err))
}

IfsWriteStream.prototype._flush = function (done: (err?: any) => void) {
  const writeStream: Promise<IfsWriteStreamType> = this._ifsWriteStream
  writeStream
    .then((stream) => stream.flush())
    .then(() => done())
    .catch((err) => done(err))
}