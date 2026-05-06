import java from 'java-bridge'
import { dirname, join as joinPath } from 'path'
import { fileURLToPath } from 'url'
import type { JT400 } from './JT400.js'

export interface JavaBridge {
  createConnection: (config: string) => Promise<JT400>
  createPool: (config: string) => JT400
  createInMemoryConnection: () => JT400
}

export const initJavaBridge = (): JavaBridge => {
  const JAR_DIR = joinPath(dirname(fileURLToPath(import.meta.url)), '/../../java/lib')

  java.appendClasspath([
    joinPath(JAR_DIR, 'jt400.jar'),
    joinPath(JAR_DIR, 'jt400wrap.jar'),
    joinPath(JAR_DIR, 'json-simple-1.1.1.jar'),
    joinPath(JAR_DIR, 'hsqldb.jar'),
  ])

  java.ensureJvm({
    opts: [
      '-Xrs',
      '-Dcom.ibm.as400.access.AS400.guiAvailable=false',
      '--enable-native-access=ALL-UNNAMED',
    ],
  })

  const JT400Class = java.importClass('nodejt400.JT400')
  const HsqlClientClass = java.importClass('nodejt400.HsqlClient')

  return {
    createConnection: (config: string) =>
      JT400Class.createConnection(config) as Promise<JT400>,
    createPool: (config: string) => JT400Class.createPoolSync(config) as JT400,
    createInMemoryConnection: () => {
      const instance = new HsqlClientClass()
      return instance as unknown as JT400
    },
  }
}
