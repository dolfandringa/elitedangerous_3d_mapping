import Dexie from 'dexie';
import { ConfigData } from './jsonpcd';

export interface SectorData {
    id: number;
    sectorName: string;
    min: {
        x: number;
        y: number;
        z: number;
    };
    max: {
        x: number;
        y: number;
        z: number;
    };
    center: {
        x: number;
        y: number;
        z: number;
    };
    size: {
        x: number;
        y: number;
        z: number;
    };
}

export const SectorSchemaVersion = 2;

export class SectorDB extends Dexie {
    sectors: Dexie.Table<SectorData, number>;
    config: Dexie.Table<ConfigData, string>;

    constructor() {
        super("ed3d_sectors");
        this.version(SectorSchemaVersion).stores({
            sectors: "++id,[min.x+max.x+min.y+max.y+min.z+max.z],[center.x+center.y+center.z],sectorName",
            config: "&key",
        })
    }
};