import type { JT400 } from './JT400';
export interface JavaBridge {
    createConnection: (config: string) => Promise<JT400>;
    createPool: (config: string) => JT400;
    createInMemoryConnection: () => JT400;
}
export declare const initJavaBridge: () => JavaBridge;
