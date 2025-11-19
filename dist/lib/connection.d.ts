import { JT400 } from '../java/JT400';
import { Connection } from './connection.types';
import { CreateInsertList } from './insertList';
import { Logger } from './logger';
export declare function createConnection({ connection, insertListFun, inMemory, logger, }: {
    connection: JT400;
    insertListFun: CreateInsertList;
    inMemory: boolean;
    logger: Logger;
}): Connection;
