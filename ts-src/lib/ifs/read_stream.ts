import { Readable } from 'stream'
import { IfsReadStream as IfsReadStreamJava } from '../../java/JT400.js'

type Opt = {
  ifsReadStream: Promise<IfsReadStreamJava>
}

export class IfsReadStream extends Readable {
  private readonly _ifsReadStream: Promise<IfsReadStreamJava>

  constructor(opt: Opt) {
    super({ objectMode: false })
    this._ifsReadStream = opt.ifsReadStream
  }

  _read() {
    this._ifsReadStream
      .then((stream) =>
        stream.read().then((res) => {
          // Cast to unknown: java-bridge may return Buffer, Uint8Array, or raw byte[] depending on JVM version
          const raw: unknown = res
          if (raw == null) {
            this.push(null)
            return
          }

          const buf =
            Buffer.isBuffer(raw)
              ? raw
              : raw instanceof Uint8Array
                ? Buffer.from(raw)
                : Buffer.from(raw as ArrayBuffer)

          if (buf.length === 0) {
            this.push(null)
            return
          }

          this.push(buf)
        }),
      )
      .catch((err: unknown) => this.emit('error', err))
  }
}
