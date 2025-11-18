// src/common/libs/jt400/javaBridge.ts
import { appendClasspath, ensureJvm, importClass } from 'java-bridge'
import { join as joinPath } from 'path'
import type { JT400 } from './JT400'

export interface JavaBridge {
  createConnection: (config: string) => Promise<JT400>
  createPool: (config: string) => JT400
  createInMemoryConnection: () => JT400
}

export const initJavaBridge = (): JavaBridge => {
  const JAR_DIR = joinPath(__dirname, '/../../java/lib')

  appendClasspath([
    joinPath(JAR_DIR, 'jt400.jar'),
    joinPath(JAR_DIR, 'jt400wrap.jar'),
    joinPath(JAR_DIR, 'json-simple-1.1.1.jar'),
    joinPath(JAR_DIR, 'hsqldb.jar'),
  ])

  // Opciones JVM (esto te funcionó)
  ensureJvm({
    opts: [
      '-Xrs',
      '-Dcom.ibm.as400.access.AS400.guiAvailable=false',
      '--enable-native-access=ALL-UNNAMED',
    ],
  })

  // Clases del wrapper Java
  const JT400Class: any = importClass('nodejt400.JT400')
  const HsqlClientClass: any = importClass('nodejt400.HsqlClient')

  return {
    createConnection: (config: string) =>
      JT400Class.createConnection(config) as Promise<JT400>, // async
    createPool: (config: string) => JT400Class.createPoolSync(config) as JT400, // sync si tu wrapper lo expone
    createInMemoryConnection: () => {
      // En java-bridge se instancia con `new`
      const instance = new HsqlClientClass()
      return instance as JT400
    },
  }
}
