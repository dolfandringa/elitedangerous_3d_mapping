import { JSONPCDLayer, Layer, EDSMLayer } from "../types";
import { openDB, deleteDB } from 'idb';
import { JSONPCDLayerSchema, JSONPCDLayerSchemaVersion } from '../types';
import * as THREE from 'three';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader';
import { BufferGeometry } from "three";

type GeomType = THREE.Points | THREE.Mesh | THREE.Line;

export class LayerDataService {

    static async syncLayer(layer: Layer) {
        if (layer instanceof JSONPCDLayer) {
            await LayerDataService.syncJSONPCDLayer(layer);
        }
        else if (layer instanceof EDSMLayer) {
            await LayerDataService.syncEDSMLayer(layer);
        }
    }

    static async syncJSONPCDLayer(layer: JSONPCDLayer) {
        const db = await openDB<JSONPCDLayerSchema>(`ed3d_${layer.name}`, JSONPCDLayerSchemaVersion, {
            upgrade(db) {
                try {
                    db.deleteObjectStore('systems');
                } catch { };
                try {
                    db.deleteObjectStore('config');
                } catch { };
                const store = db.createObjectStore('systems', { keyPath: 'id', autoIncrement: true });
                store.createIndex('coords', ['x', 'y', 'z'], { multiEntry: false });
                const config_store = db.createObjectStore('config');
            },
        });
        const import_date = await db.get('config', 'importDate');
        const json_filename = `${layer.name}.json`;
        const res = await fetch(json_filename, { cache: "no-cache", method: 'HEAD' });
        let last_modified = new Date(res.headers.get("Last-Modified"));
        if (!import_date || new Date(import_date) < last_modified) {
            const res = await fetch(json_filename, { cache: "no-cache", method: 'GET' });
            console.log('importing data');
            await db.clear('systems');
            let json = await res.json();
            const tx = db.transaction('systems', 'readwrite');
            for (const system of json) {
                const { x, y, z, systemName, ...systemInfo } = system;
                tx.store.add({ x, y, z, systemName, systemInfo });
            }
            await tx.done;
            console.log("Finished adding system data");
            await db.put('config', new Date().toISOString(), 'importDate');
        } else {
            console.log('Database for layer', layer.name, 'already up-to-date.')
        }
    }

    static async syncEDSMLayer(layer: EDSMLayer) {

    }

    static async getLayer(layer: Layer): Promise<GeomType | void> {
        if (layer instanceof JSONPCDLayer) {
            return await LayerDataService.getJSONPCDLayer(layer);
        }
        else if (layer instanceof EDSMLayer) {
            return await LayerDataService.getEDSMLayer(layer);
        }
    }

    static getJSONPCDLayer(layer: JSONPCDLayer): Promise<THREE.Points | void> {
        const loader = new PCDLoader();
        return new Promise((resolve, reject) => {
            try {
                loader.load(`${layer.name}.pcd`, (points: THREE.Points<BufferGeometry>) => {
                    points.layers.set(0);
                    const sprite = new THREE.TextureLoader().load('images/circle.png');

                    const num_points = points.geometry.attributes.position.count;
                    let colors = [];
                    let sizes = []
                    for (let i = 0; i < num_points; i++) {
                        sizes.push(10);
                        colors.push(0.8, 0.8, 0.8);
                    }
                    points.geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
                    points.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                    const material = new THREE.PointsMaterial({
                        vertexColors: true,
                        size: 10,
                        map: sprite,
                        transparent: true,
                        alphaTest: 0.8,
                        sizeAttenuation: true,
                    })
                    points.material = material;
                    points.geometry.computeBoundingBox();
                    resolve(points)
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    static async getEDSMLayer(layer: EDSMLayer): Promise<THREE.Points | void> {
        return
    }
}