import {ConfigData, JSONPCDLayerSchemaVersion} from './jsonpcd';
import {System} from '../types';
import Dexie from 'dexie';

export const EDSMLayerSchemaVersion=JSONPCDLayerSchemaVersion+1;

export interface SectorUpdateInfo {
    sector_number: number[];
    updatedDate: Date;
    lastLoadedDate: Date;
}

export class EDSMLayerDB extends Dexie {
    systems: Dexie.Table<System, number>;
    config: Dexie.Table<ConfigData, string>;
    sectors: Dexie.Table<SectorUpdateInfo, number[]>;

    constructor(name: string) {
        super(`ed3d_${name}`);
        this.version(EDSMLayerSchemaVersion).stores({
            systems: "++id,[x+y+z],sector,systemName",
            config: "&key",
            sectors: "&sector_number,updatedDate,lastLoadedDate",
        })
    }
};
