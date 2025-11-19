import { JDBCConnection } from '../java/JT400';
import { BaseConnection } from './baseConnection.types';
import { CreateInsertList } from './insertList';
import { Logger } from './logger';
export declare const createBaseConnection: (jdbcConnection: JDBCConnection, insertListFun: CreateInsertList, logger: Logger, inMemory: boolean) => BaseConnection;
