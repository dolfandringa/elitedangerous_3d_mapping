import { SystemData, ConfigData, JSONPCDLayerSchemaVersion } from './jsonpcd';
import Dexie from 'dexie';

export const EDSMLayerSchemaVersion = JSONPCDLayerSchemaVersion;

export class EDSMLayerDB extends Dexie {
    systems: Dexie.Table<SystemData, number>;
    config: Dexie.Table<ConfigData, string>;

    constructor(name: string) {
        super(`ed3d_${name}`);
        this.version(EDSMLayerSchemaVersion).stores({
            systems: "++id,[x+y+z],sector,systemName",
            config: "&key",
        })
    }
};