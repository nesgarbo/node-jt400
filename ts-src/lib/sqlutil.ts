import { Param } from './baseConnection.types.js'

function recordToValues(record: Record<string, Param>): string {
  const str = Object.keys(record)
    .map(() => '?')
    .join(', ')
  return '(' + str + ')'
}

export function toInsertSql(tableName: string, records: Record<string, Param>[]): string {
  if (!records.length) throw new Error('toInsertSql requires at least one record')
  const first = records[0]
  const keys = Object.keys(first)
  const sql = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES${records
    .map(recordToValues)
    .join(', ')}`
  return sql
}
