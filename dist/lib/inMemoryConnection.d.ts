import { JavaBridge } from '../java';
import { Connection } from './connection.types';
import { Logger } from './logger';
export interface InMemoryConnection extends Connection {
    mockPgm: (programName: string, fn: (input: any) => any) => InMemoryConnection;
}
export declare function createInMemoryConnection(jt400Factory: JavaBridge, logger: Logger): InMemoryConnection;
