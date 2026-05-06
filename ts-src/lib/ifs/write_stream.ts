import { Writable } from 'stream'
import { IfsWriteStream as IfsWriteStreamJava } from '../../java/JT400.js'

type Opt = {
  ifsWriteStream: Promise<IfsWriteStreamJava>
}

export class IfsWriteStream extends Writable {
  private readonly _ifsWriteStream: Promise<IfsWriteStreamJava>

  constructor(opt: Opt) {
    super({ objectMode: false })
    this._ifsWriteStream = opt.ifsWriteStream
  }

  _write(chunk: Buffer, _: BufferEncoding, next: (err?: Error | null) => void) {
    this._ifsWriteStream
      .then((stream) => stream.write(chunk))
      .then(() => next())
      .catch((err) => next(err))
  }

  _final(done: (err?: Error | null) => void) {
    this._ifsWriteStream
      .then((stream) => stream.flush())
      .then(() => done())
      .catch((err) => done(err))
  }
}
