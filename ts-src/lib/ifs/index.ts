import { basename, dirname } from 'path'
import { JT400 } from '../../java/JT400'
import { IfsReadStream } from './read_stream.js'
import { Ifs } from './types'
import { IfsWriteStream } from './write_stream.js'

export function ifs(
  connection: JT400,
): Ifs {
  return {
    createReadStream: function (fileName: string | Promise<string>) {
      const javaStream = Promise.resolve(fileName).then(function (file) {
        return connection.createIfsReadStream(file)
      })
      return new IfsReadStream({
        ifsReadStream: javaStream,
      })
    },
    createWriteStream: function (
      fileName: string | Promise<string>,
      options: { append: boolean; ccsid?: number } = { append: false },
    ) {
      const javaStream = Promise.resolve(fileName).then(function (file) {
        const folderPath = dirname(file)
        const fileName = basename(file)
        return connection.createIfsWriteStream(
          folderPath,
          fileName,
          options.append,
          options.ccsid,
        )
      })
      return new IfsWriteStream({
        ifsWriteStream: javaStream,
      })
    },
    listFiles: async (folderName: string) => {
      const files = await connection.listIfsFiles(folderName)
      return files || []
    },
    moveFile: (fileName: string, newFileName: string) =>
      connection.moveIfsFile(fileName, newFileName),
    deleteFile: (fileName: string) => connection.deleteIfsFile(fileName),
    fileMetadata: (fileName: string) =>
      connection.getIfsFileMetadata(fileName).then(JSON.parse),
  }
}
