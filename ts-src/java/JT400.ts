export interface ResultStream {
  close: () => Promise<void>
  read: () => Promise<string>
}

export interface StatementWrap {
  prepare: (sql: string) => Promise<void>
  isQuerySync: () => boolean
  close: () => Promise<void>
  updated: () => Promise<number>
  getMetaData: () => Promise<string>
  asStreamSync: (bufferSize: number) => ResultStream
  asArray: () => Promise<string>
  next: () => Promise<string>
}

export interface TablesReadStream {
  close: () => Promise<void>
  read: () => Promise<string>
  getMetaData: () => Promise<string>
}

export interface JDBCConnection {
  query: (sql: string, jsonParams: string, trim: boolean) => Promise<string>
  queryAsStream: (
    sql: string,
    jsonParams: string,
    bufferSize: number,
  ) => Promise<ResultStream>

  execute: (sql: string, jsonParams: string) => Promise<StatementWrap>
  getTablesAsStreamSync: (
    catalog: string | undefined,
    schema: string,
    tableName: string,
  ) => TablesReadStream
  getColumns: (
    catalog: string | undefined,
    schema: string,
    tableNamePattern: string,
    columnNamePattern: string,
  ) => Promise<string>
  update: (sql: string, jsonParams: string) => Promise<number>
  batchUpdate: (sql: string, jsonParams: string) => Promise<number[]>
  insertAndGetId: (sql: string, jsonParams: string) => Promise<number>
  commit: () => Promise<void>
  rollback: () => Promise<void>
  createStatement: () => Promise<StatementWrap>
  /** CursorWrap — not yet used in current implementation */
  queryAsCursor: (
    sql: string,
    jsonParams: string,
    fetchSize: number,
    trim: boolean
  ) => Promise<CursorWrap>
}

export interface CursorWrap {
  next: () => Promise<string>
  close: () => Promise<void>
}

export interface Transaction extends JDBCConnection {
  commit: () => Promise<void>
  rollback: () => Promise<void>
  end: () => Promise<void>
}

export interface Pgm {
  run: (jsonParams: string, timeout: number) => Promise<string>
}

export interface MessageQ {
  read: (wait: number) => Promise<string>
  sendInformational: (message: string) => Promise<void>
}

export interface KeyedDataQueueResponse {
  getData: () => Promise<string>

  write: (data: string) => Promise<void>
}
export interface KeyedDataQ {
  read: (key: string, wait: number) => Promise<string>
  readResponse: (
    key: string,
    wait: number,
    writeKeyLength: number,
  ) => Promise<KeyedDataQueueResponse>
  write: (key: string, data: string) => Promise<void>
}

export interface AS400Message {
  getText: () => Promise<string>
}

export interface MessageFileHandler {
  read: (messageId: string) => Promise<AS400Message>
}

export interface IfsReadStream {
  read: () => Promise<Buffer>
}

export interface IfsWriteStream {
  write: (data: Buffer) => Promise<void>
  flush: () => Promise<void>
}

export interface JT400 extends JDBCConnection {
  createTransactionSync: () => Transaction
  getPrimaryKeys: (
    catalog: string | undefined,
    schema: string | undefined,
    table: string,
  ) => Promise<string>
  pgmSync: (
    programName: string,
    paramsSchemaJsonStr: string,
    libraryName?: string,
    ccsid?: number,
  ) => Pgm
  openMessageQ: (name: string, isPath: boolean) => Promise<MessageQ>
  createKeyedDataQSync: (name: string) => KeyedDataQ
  openMessageFile: (path: string) => Promise<MessageFileHandler>
  createIfsReadStream: (fileName: string) => Promise<IfsReadStream>
  createIfsWriteStream: (
    folderPath: string,
    fileName: string,
    append: boolean,
    ccsid?: number,
  ) => Promise<IfsWriteStream>
  listIfsFiles: (folderName: string) => Promise<string[]>
  moveIfsFile: (fileName: string, newFileName: string) => Promise<boolean>
  deleteIfsFile: (fileName: string) => Promise<boolean>
  getIfsFileMetadata: (fileName: string) => Promise<string>
  close: () => Promise<void>
}
