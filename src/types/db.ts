import { DBSchema } from 'idb';

export const JSONPCDLayerSchemaVersion = 1;

export interface SystemData {
    x: number;
    y: number;
    z: number;
    systemName: string;
    systemInfo: object;
}

export interface JSONPCDLayerSchema extends DBSchema {
    systems: {
        key: number;
        value: SystemData;
        indexes: { 'coords': number[], 'systemName': string };
    };
    'config': {
        key: string;
        value: string;
    }

}

export const EDSMLayerSchemaVersion = JSONPCDLayerSchemaVersion;


export interface EDSMLayerSchema extends JSONPCDLayerSchema {

}