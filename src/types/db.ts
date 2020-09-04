import { DBSchema } from 'idb';

export const JSONPCDLayerSchemaVersion = 1;

export interface JSONPCDLayerSchema extends DBSchema {
    systems: {
        key: number;
        value: {
            x: number;
            y: number;
            z: number;
            systemName: string;
            systemInfo: object;
        };
        indexes: { 'coords': number[], 'systemName': string };
    };
    'config': {
        key: string;
        value: string;
    }

}