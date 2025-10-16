import { pool, Connection } from '../index'
export const jt400: Connection = pool({
  'date format': 'iso',
})
