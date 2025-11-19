import { BaseConnection, InsertList } from './baseConnection.types';
export type CreateInsertList = (connection: BaseConnection) => InsertList;
export declare const createInsertListInOneStatment: CreateInsertList;
export declare const createStandardInsertList: CreateInsertList;
