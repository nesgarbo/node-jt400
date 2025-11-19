// src/common/libs/jt400/javaBridge.ts
import java from 'java-bridge'
import { join as joinPath } from 'path'
import type { JT400 } from './JT400.js'

export interface JavaBridge {
  createConnection: (config: string) => Promise<JT400>
  createPool: (config: string) => JT400
  createInMemoryConnection: () => JT400
}

export const initJavaBridge = (): JavaBridge => {
  const JAR_DIR = joinPath(__dirname, '/../../java/lib')

  java.appendClasspath([
    joinPath(JAR_DIR, 'jt400.jar'),
    joinPath(JAR_DIR, 'jt400wrap.jar'),
    joinPath(JAR_DIR, 'json-simple-1.1.1.jar'),
    joinPath(JAR_DIR, 'hsqldb.jar'),
  ])

  // Opciones JVM (esto te funcionó)
  java.ensureJvm({
    opts: [
      '-Xrs',
      '-Dcom.ibm.as400.access.AS400.guiAvailable=false',
      '--enable-native-access=ALL-UNNAMED',
    ],
  })

  // Clases del wrapper Java
  const JT400Class = java.importClass('nodejt400.JT400')
  const HsqlClientClass = java.importClass('nodejt400.HsqlClient')

  return {
    createConnection: (config: string) =>
      JT400Class.createConnection(config) as Promise<JT400>, // async
    createPool: (config: string) => JT400Class.createPoolSync(config) as JT400, // sync si tu wrapper lo expone
    createInMemoryConnection: () => {
      // En java-bridge se instancia con `new`
      const instance = new HsqlClientClass()
      return instance as unknown as JT400
    },
  }
}

// export const initNewJavaBridge = (): JavaBridge => {
//   ensureJvm({
//     // This option should not have any effect when not using electron or not having the application packaged.
//     // https://github.com/MarkusJx/node-java-bridge?tab=readme-ov-file#notes-on-electron
//     isPackagedElectron: true,

//     opts: [
//       '-Xrs',
//       '-Dcom.ibm.as400.access.AS400.guiAvailable=false', // Removes gui prompts
//     ],
//   })
//   appendClasspath(
//     ['jt400.jar', 'jt400wrap.jar', 'json-simple-1.1.1.jar', 'hsqldb.jar'].map(
//       (jar) => joinPath(currentDir, '/../../java/lib/', jar)
//     )
//   )

//   const JT400Class = importClass('nodejt400.JT400')
//   return {
//     createConnection: (config: string) => JT400Class.createConnection(config),
//     createInMemoryConnection: () => {
//       const HsqlClientClass = importClass('nodejt400.HsqlClient')
//       const instance: any = new HsqlClientClass()
//       return instance
//     },
//     createPool: (config: string) => JT400Class.createPoolSync(config),
//     bufferToJavaType: (buffer: Buffer) => buffer,
//     javaTypeToBuffer: (javaType: any) => javaType,
//   }
// }
