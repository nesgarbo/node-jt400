import { toInsertSql } from '../lib/sqlutil.js'
import assert from 'assert'

describe('sql helpers', () => {
  it('should create sql statement for multiple records', () => {
    const records = [
      { foo: 'bar', baz: 123 },
      { foo: 'ble', baz: 456 },
    ]
    assert.strictEqual(
      toInsertSql('myTable', records),
      'INSERT INTO myTable (foo, baz) VALUES(?, ?), (?, ?)',
    )
  })

  it('should create sql statement for a single record', () => {
    assert.strictEqual(
      toInsertSql('tbl', [{ x: 1 }]),
      'INSERT INTO tbl (x) VALUES(?)',
    )
  })

  it('should handle null values in records', () => {
    assert.strictEqual(
      toInsertSql('tbl', [{ a: null, b: 'ok' }]),
      'INSERT INTO tbl (a, b) VALUES(?, ?)',
    )
  })

  it('should handle Date values in records', () => {
    assert.strictEqual(
      toInsertSql('tbl', [{ dt: new Date(), name: 'x' }]),
      'INSERT INTO tbl (dt, name) VALUES(?, ?)',
    )
  })

  it('should throw for empty array', () => {
    assert.throws(
      () => toInsertSql('tbl', []),
      /toInsertSql requires at least one record/,
    )
  })

  it('should handle records with multiple columns', () => {
    const records = [{ a: 1, b: 2, c: 3 }]
    assert.strictEqual(
      toInsertSql('tbl', records),
      'INSERT INTO tbl (a, b, c) VALUES(?, ?, ?)',
    )
  })
})
