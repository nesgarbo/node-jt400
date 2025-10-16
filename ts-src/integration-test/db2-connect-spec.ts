import { connect } from '../index'
import assert from 'assert'

describe('connect', () => {
  it('should connect', async () => {
    const db = await connect()
    const nUpdated = await db.update('delete from tsttbl')
    assert.ok(nUpdated >= 0)
  }).timeout(10000)

  it('should close', async () => {
    const db = await connect()
    await db.close()

    return db
      .update('delete from tsttbl')
      .then(() => {
        throw new Error('should not be connected')
      })
      .catch((err) => {
        assert.strictEqual(err.message, 'The connection does not exist.')
        assert.strictEqual(err.category, 'OperationalError')
      })
  }).timeout(6000)
})
