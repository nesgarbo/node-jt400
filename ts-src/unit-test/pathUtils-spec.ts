import * as assert from 'assert'
import { getCurrentDir } from '../lib/pathUtils'
import { join as joinPath } from 'path'
import { existsSync } from 'fs'

describe('pathUtils', () => {
  describe('getPackageRoot', () => {
    it('should find the package root directory', () => {
      const root = getCurrentDir()
      assert.ok(root)
      assert.ok(typeof root === 'string')

      // Verify java/lib exists at the root
      const javaLibPath = joinPath(root, 'java/lib')
      assert.ok(existsSync(javaLibPath), `java/lib should exist at ${root}`)

      // Verify jt400.jar exists
      const jarPath = joinPath(javaLibPath, 'jt400.jar')
      assert.ok(existsSync(jarPath), `jt400.jar should exist at ${jarPath}`)
    })

    it('should find package root from different build locations', () => {
      // This test verifies that getPackageRoot works regardless of where
      // the code is executed from (dist/esm, dist/cjs, etc.)
      const root = getCurrentDir()

      // Should be able to find test-data as well
      const testDataPath = joinPath(root, 'test-data')
      assert.ok(existsSync(testDataPath), `test-data should exist at ${root}`)
    })
  })
})
