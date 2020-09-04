import { JSONPCDLayer, Layer, EDSMLayer, BoundingSphere, SystemData } from "../types";
import { openDB, deleteDB } from 'idb';
import { JSONPCDLayerSchema, JSONPCDLayerSchemaVersion, EDSMLayerSchema, EDSMLayerSchemaVersion } from '../types';
import * as THREE from 'three';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader';
import { BufferGeometry, SpotLightHelper } from "three";

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
        const db = await openDB<EDSMLayerSchema>(`ed3d_${layer.name}`, EDSMLayerSchemaVersion, {
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
    }

    static async getLayer(layer: Layer, sphere: BoundingSphere): Promise<GeomType | void> {
        if (layer instanceof JSONPCDLayer) {
            return await LayerDataService.getJSONPCDLayer(layer, sphere);
        }
        else if (layer instanceof EDSMLayer) {
            return await LayerDataService.getEDSMLayer(layer, sphere);
        }
    }

    static getSystemMaterial(size = 10): THREE.PointsMaterial {
        const texture_loader = new THREE.TextureLoader();
        const system_sprite = texture_loader.load('images/circle.png');
        return new THREE.PointsMaterial({
            vertexColors: true,
            size,
            map: system_sprite,
            color: 0xffffff,
            transparent: true,
            alphaTest: 0.8,
            sizeAttenuation: true,
        });
    }

    static getJSONPCDLayer(layer: JSONPCDLayer, sphere: BoundingSphere): Promise<THREE.Points | void> {
        const loader = new PCDLoader();
        return new Promise((resolve, reject) => {
            try {
                loader.load(`${layer.name}.pcd`, (points: THREE.Points<BufferGeometry>) => {
                    points.layers.set(0);

                    const num_points = points.geometry.attributes.position.count;
                    let colors = [];
                    let sizes = []
                    for (let i = 0; i < num_points; i++) {
                        sizes.push(10);
                        colors.push(0.8, 0.8, 0.8);
                    }
                    points.geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
                    points.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                    points.material = LayerDataService.getSystemMaterial();
                    points.geometry.computeBoundingBox();
                    resolve(points)
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    static async storeEDSMSystems(systems: SystemData[], layer: Layer) {
        const db = await openDB<EDSMLayerSchema>(`ed3d_${layer.name}`, EDSMLayerSchemaVersion);
        const tx = db.transaction('systems', 'readwrite');
        for (const system of systems) {
            tx.store.add(system);
        }
        await tx.done;
        await db.put('config', new Date().toISOString(), 'importDate');
    }

    static async getEDSMLayer(layer: EDSMLayer, sphere: BoundingSphere): Promise<THREE.Points | void> {
        console.log("Getting EDSM systems");
        console.log("for layer", layer, "and sphere", sphere)
        let url = new URL(layer.endpoint);
        url.search = new URLSearchParams({
            ...layer.parameters,
            x: sphere.center.x.toString(),
            y: sphere.center.y.toString(),
            z: sphere.center.z.toString(),
            radius: Math.min(sphere.radius, 100).toString(),
        }).toString();
        let res = await fetch(url.toString());
        console.log("Fetching", url.toString());
        if (!res.ok) {
            console.error("Error loading EDSMLayer", layer, "error", res.status, res.statusText);
            return;
        }
        const systems = await res.json();
        console.log("Got systems", systems);

        if (!(systems instanceof Array)) {
            console.log("No systems found");
            return;
        }
        let geom = new THREE.BufferGeometry();

        let positions = [];
        let colors = [];
        let dbSystems: SystemData[] = [];

        for (let system of systems) {
            positions = [...positions, system.coords.x, system.coords.y, system.coords.z];
            colors = [...colors, 0.7, 0.7, 0.7];
            const { name, coords, systemInfo } = system;
            dbSystems.push({ x: coords.x, y: coords.y, z: coords.z, systemName: name, systemInfo });
        }

        LayerDataService.storeEDSMSystems(dbSystems, layer);

        let point = new THREE.Points(geom, LayerDataService.getSystemMaterial());
        point.userData = { source: 'EDSM', sphere, layer };
        point.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        point.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        point.geometry.attributes.color.needsUpdate = true;
        point.geometry.attributes.position.needsUpdate = true;
        return point;
    }
}