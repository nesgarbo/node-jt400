import { Readable } from 'stream'
import { BaseConnection, Close, Metadata, Param } from './baseConnection.types.js'
import { Ifs } from './ifs/types.js'

export interface ProgramDefinitionOptions {
  programName: string
  paramsSchema: PgmParamType[]
  libraryName?: string
  ccsid?: number
}

export interface PgmParamType1 {
  name: string
  size: number
  type?: string
  decimals?: number
}

export interface PgmParamType2 {
  name: string
  precision: number
  typeName?: string
  scale?: number
}

export interface PgmParamStructType {
  [key: string]: PgmParamType[]
}

export type PgmParamType = PgmParamType1 | PgmParamType2 | PgmParamStructType

export interface JustNameMessageQ {
  name: string
}
export interface JustPathMessageQ {
  path: string
}
export type MessageQOptions = JustNameMessageQ | JustPathMessageQ

export interface MessageQReadOptions {
  wait?: number
}

export interface DataQReadOptions {
  key: string
  wait?: number
  writeKeyLength?: number
}
export interface MessageFileHandlerOptions {
  /** Message File Location, e.g. /QSYS.LIB/YOURLIBRARY.LIB/YOURMSGFILE.MSGF */
  path: string
}
export interface MessageFileReadOptions {
  /** Message Key */
  messageId: string
}

export interface MessageQMessage {
  text: string
  [key: string]: unknown
}

export interface MessageQ {
  sendInformational: (messageText: string) => Promise<void>
  read: (params?: MessageQReadOptions) => Promise<MessageQMessage | null>
}

export interface DataQOptions {
  name: string
}

export interface DataQReadResult {
  data: string
  write: (data: string) => Promise<void>
}

export interface KeyedDataQ {
  write: (key: string, data: string) => void
  read: (params: DataQReadOptions | string) => Promise<string | DataQReadResult>
}

export interface AS400Message {
  getText: () => Promise<string>
}

export interface MessageFileHandler {
  read: (params: MessageFileReadOptions) => Promise<AS400Message>
}

export type TransactionFun<T = unknown> = (transaction: BaseConnection) => Promise<T>

export interface GetTablesParams {
  catalog?: string
  schema: string
  table?: string
}

export type ColumnInfo = Metadata

export interface PrimaryKeyInfo {
  name: string
  [key: string]: unknown
}

export interface Connection extends BaseConnection {
  pgm: (
    programName: string,
    paramsSchema: PgmParamType[],
    libraryName?: string,
  ) => (params: Record<string, Param>, timeout?: number) => Promise<unknown>
  defineProgram: (options: ProgramDefinitionOptions) => (params: Record<string, Param>, timeout?: number) => Promise<unknown>
  getTablesAsStream: (params: GetTablesParams) => Readable
  getColumns: (params: { catalog?: string; schema: string; table: string; columns?: string }) => Promise<ColumnInfo[]>
  getPrimaryKeys: (params: { catalog?: string; schema?: string; table: string }) => Promise<PrimaryKeyInfo[]>
  transaction: <T = unknown>(fn: TransactionFun<T>) => Promise<T>
  openMessageQ: (params: MessageQOptions) => Promise<MessageQ>
  createKeyedDataQ: (params: DataQOptions) => KeyedDataQ
  openMessageFile: (
    params: MessageFileHandlerOptions,
  ) => Promise<MessageFileHandler>
  ifs: () => Ifs
  close: Close
}
