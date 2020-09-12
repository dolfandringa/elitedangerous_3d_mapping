import Dexie from 'dexie';
import { ConfigData } from './jsonpcd';
import { Sector } from '../types';

export const SectorSchemaVersion = 2;

export class SectorDB extends Dexie {
    sectors: Dexie.Table<Sector, number>;
    config: Dexie.Table<ConfigData, string>;

    constructor() {
        super("ed3d_sectors");
        this.version(SectorSchemaVersion).stores({
            sectors: "++id,[min.x+max.x+min.y+max.y+min.z+max.z],[center.x+center.y+center.z],sectorName,sector_number",
            config: "&key",
        })
    }
};
