import { pool, Connection } from '../index.js'
export const jt400: Connection = pool({
  'date format': 'iso',
})
