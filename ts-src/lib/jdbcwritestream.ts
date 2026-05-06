import { Writable } from 'stream'
import { BatchUpdate, Param } from './baseConnection.types.js'

export function createJdbcWriteStream(
  batchUpdate: BatchUpdate,
  statement: string,
  bufferSize: number = 100,
): Writable {
  let dataBuffer: Param[][] = []

  function flush(done: (err?: Error | null) => void) {
    const d = dataBuffer
    dataBuffer = []
    batchUpdate(statement, d)
      .then(() => done())
      .catch(done)
  }

  const ws = new Writable({ objectMode: true })

  ws._write = function (chunk: Param[], _: string, next: (err?: Error | null) => void) {
    dataBuffer.push(chunk)
    if (dataBuffer.length >= bufferSize) {
      flush(next)
    } else {
      next()
    }
  }

  ws._final = function (done: (err?: Error | null) => void) {
    if (dataBuffer.length) {
      flush(done)
    } else {
      done()
    }
  }

  return ws
}
