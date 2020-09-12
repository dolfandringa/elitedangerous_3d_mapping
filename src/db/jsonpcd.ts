import Dexie from 'dexie';
import { System } from '../types';

export const JSONPCDLayerSchemaVersion = 3;

export interface ConfigData {
    key?: string;
    value?: string;
}

export class JSONPCDLayerDB extends Dexie {
    systems: Dexie.Table<System, number>;
    config: Dexie.Table<ConfigData, string>;

    constructor(name: string) {
      super(`ed3d_${name}`);
      this.version(JSONPCDLayerSchemaVersion).stores({
        systems: '++id,[x+y+z],sector,systemName',
        config: '&key',
      });
    }
}
