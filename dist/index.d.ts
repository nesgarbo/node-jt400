import { Connection } from './lib/connection.types';
import { InMemoryConnection } from './lib/inMemoryConnection';
import { Logger } from './lib/logger';
export * from './lib/baseConnection.types';
export * from './lib/connection.types';
export * from './lib/ifs/types';
export { InMemoryConnection, Logger };
export type JT400Options = {
    logger?: Logger;
};
export declare function pool(config?: {}, options?: JT400Options): Connection;
export declare function connect(config?: {}, options?: JT400Options): Promise<Connection>;
export declare function useInMemoryDb(options?: JT400Options): InMemoryConnection;
