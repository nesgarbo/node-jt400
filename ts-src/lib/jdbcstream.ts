import { Readable } from 'stream'
import { ResultStream } from '../java/JT400.js'

type Opt = {
  jdbcStream?: ResultStream
  jdbcStreamPromise?: Promise<ResultStream>
}

export class JdbcStream extends Readable {
  private _jdbcStream?: ResultStream
  private _jdbcStreamPromise?: Promise<ResultStream>
  private _closed = false

  constructor(opt: Opt) {
    super({ objectMode: false })
    this._jdbcStream = opt.jdbcStream
    this._jdbcStreamPromise = opt.jdbcStreamPromise
  }

  close() {
    this._closed = true
  }

  private _readFromStream(stream: ResultStream) {
    if (this._closed) {
      stream.close().catch((err) => {
        if (err) this.emit('error', err)
      })
      this.push(null)
    } else {
      stream
        .read()
        .then((res) => this.push(res))
        .catch((err) => this.emit('error', err))
    }
  }

  _read() {
    if (!this._jdbcStream) {
      this._jdbcStreamPromise!
        .then((stream) => {
          this._jdbcStream = stream
          this._readFromStream(stream)
        })
        .catch((err) => this.emit('error', err))
    } else {
      this._readFromStream(this._jdbcStream)
    }
  }
}
