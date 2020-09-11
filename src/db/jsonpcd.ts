import Dexie from 'dexie';

export const JSONPCDLayerSchemaVersion = 3;

export interface SystemData {
    id?: number;
    x: number;
    y: number;
    z: number;
    sector?: number[];
    systemName: string;
    systemInfo?: object;
}

export interface ConfigData {
    key?: string;
    value?: string;
    multi_number_value?: number[];
}

export class JSONPCDLayerDB extends Dexie {
    systems: Dexie.Table<SystemData, number>;
    config: Dexie.Table<ConfigData, string>;

    constructor(name: string) {
        super(`ed3d_${name}`);
        this.version(JSONPCDLayerSchemaVersion).stores({
            systems: "++id,[x+y+z],sector,systemName",
            config: "&key",
        })
    }
};