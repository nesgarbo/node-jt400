import { Readable } from 'stream'
import { arrayToObject } from '../lib/streamTransformers.js'
import { parse } from 'JSONStream'
import assert from 'assert'

const collectStream = (stream: Readable): Promise<unknown[]> =>
  new Promise((resolve, reject) => {
    const results: unknown[] = []
    stream.on('data', (data) => results.push(data))
    stream.on('end', () => resolve(results))
    stream.on('error', reject)
  })

const streamError = (stream: Readable): Promise<Error> =>
  new Promise((resolve, reject) => {
    stream.on('error', resolve)
    stream.on('end', () => reject(new Error('Expected stream error but got end')))
  })

const twoColMeta = [
  { name: 'id', typeName: 'INTEGER', precision: 10, scale: 0 },
  { name: 'name', typeName: 'VARCHAR', precision: 100, scale: 0 },
]

function makeJsonStream(data: unknown): Readable {
  const s = new Readable({ read() {} })
  s.push(JSON.stringify(data))
  s.push(null)
  return s
}

describe('streamTransformers', () => {
  describe('arrayToObject', () => {
    it('should convert an array stream to objects', async () => {
      const objectStream = makeJsonStream([[1, 'Jón'], [2, 'Gunna']])
        .pipe(parse('*'))
        .pipe(arrayToObject(twoColMeta))

      const results = await collectStream(objectStream)
      assert.deepStrictEqual(results, [
        { id: 1, name: 'Jón' },
        { id: 2, name: 'Gunna' },
      ])
    })

    it('should pass null values through unchanged', async () => {
      const objectStream = makeJsonStream([[1, null]])
        .pipe(parse('*'))
        .pipe(arrayToObject(twoColMeta))

      const results = await collectStream(objectStream)
      assert.deepStrictEqual(results, [{ id: 1, name: null }])
    })

    it('should throw error when not a json array (missing parse step)', async () => {
      const objectStream = makeJsonStream([[1, 'Jón']]).pipe(arrayToObject(twoColMeta))
      const err = await streamError(objectStream)
      assert.strictEqual(err.message, 'Expected an array chunk as input')
    })

    it('should throw error when column length and stream data length do not match', async () => {
      const objectStream = makeJsonStream([[1, 'Jón', 'extra']])
        .pipe(parse('*'))
        .pipe(arrayToObject(twoColMeta))

      const err = await streamError(objectStream)
      assert.strictEqual(
        err.message,
        'Array chunk length 3 does not match columns length 2',
      )
    })

    it('should handle empty result set', async () => {
      const s = new Readable({ read() {} })
      s.push(JSON.stringify([]))
      s.push(null)
      const objectStream = s.pipe(parse('*')).pipe(arrayToObject(twoColMeta))
      const results = await collectStream(objectStream)
      assert.deepStrictEqual(results, [])
    })

    it('should handle empty metadata with empty chunk', async () => {
      const emptyMeta = [{ name: 'x', typeName: 'INTEGER', precision: 10, scale: 0 }]
      const objectStream = makeJsonStream([[42]])
        .pipe(parse('*'))
        .pipe(arrayToObject(emptyMeta))
      const results = await collectStream(objectStream)
      assert.deepStrictEqual(results, [{ x: 42 }])
    })
  })
})
