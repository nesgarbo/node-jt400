import util from 'util'
import { Readable } from 'stream'
import { IfsReadStream as IfsReadStreamType } from '../../java/JT400.js'

type Opt = {
  ifsReadStream: Promise<IfsReadStreamType>
}

export function IfsReadStream(opt: Opt) {
  Readable.call(this, { objectMode: false })
  this._ifsReadStream = opt.ifsReadStream
}

util.inherits(IfsReadStream, Readable)

IfsReadStream.prototype._read = function () {
  const streamPromise: Promise<IfsReadStreamType> = this._ifsReadStream
  streamPromise
    .then((stream) =>
      stream.read().then((res: any) => {
        // java-bridge convierte byte[] -> Buffer automáticamente
        if (res == null) {
          this.push(null) // EOF
          return
        }

        const buf =
          Buffer.isBuffer(res) ? res : res instanceof Uint8Array ? Buffer.from(res) : Buffer.from(res as any)

        if (buf.length === 0) {
          this.push(null) // EOF defensivo si llega vacío
          return
        }

        this.push(buf)
      }),
    )
    .catch((err: any) => this.emit('error', err))
}
