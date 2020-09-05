import { JSONPCDLayer, Layer, EDSMLayer, BoundingSphere, BoundingBox } from "../types";
import { JSONPCDLayerDB, EDSMLayerDB, SectorDB, SystemData } from '../db';
import * as THREE from 'three';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader';
import { BufferGeometry, SpotLightHelper } from "three";
import { countBy } from "lodash";

type GeomType = THREE.Points | THREE.Mesh | THREE.Line | THREE.Group;

export class LayerDataService {

    static async syncLayer(layer: Layer) {
        if (layer instanceof JSONPCDLayer) {
            await LayerDataService.syncJSONPCDLayer(layer);
        }
        else if (layer instanceof EDSMLayer) {
            await LayerDataService.syncEDSMLayer(layer);
        }
    }

    static async syncSectorsTable() {
        const db = new SectorDB();
        const import_date = (await db.config.get('importDate') || { value: undefined }).value;
        const json_filename = 'sectors.json';
        const res = await fetch(json_filename, { cache: "no-cache", method: 'HEAD' });
        let last_modified = new Date(res.headers.get("Last-Modified"));
        if (!import_date || new Date(import_date) < last_modified) {
            const res = await fetch(json_filename, { cache: "no-cache", method: 'GET' });
            console.log('importing data');
            await db.config.clear();
            await db.sectors.clear();
            let json = await res.json();
            await db.transaction('rw', db.sectors, async () => {
                for (const sector of json) {
                    db.sectors.add(sector);
                }
            });

            console.log("Finished adding system data");
            await db.config.put({ key: 'importDate', value: new Date().toISOString() }, 'importDate');
            await db.config.put({ key: 'ready', value: "1" }, 'ready');
        } else {
            console.log('Sectors database already up-to-date.')
        }
    }

    static async syncJSONPCDLayer(layer: JSONPCDLayer) {
        const db = new JSONPCDLayerDB(layer.name);
        const import_date = (await db.config.get('importDate') || { value: undefined }).value;
        const json_filename = `${layer.name}.json`;
        const res = await fetch(json_filename, { cache: "no-cache", method: 'HEAD' });
        let last_modified = new Date(res.headers.get("Last-Modified"));
        if (!import_date || new Date(import_date) < last_modified) {
            const res = await fetch(json_filename, { cache: "no-cache", method: 'GET' });
            console.log('importing data');
            await db.systems.clear();
            let json = await res.json();
            await db.transaction('rw', db.systems, async () => {
                for (const system of json) {
                    const { x, y, z, systemName, ...systemInfo } = system;
                    db.systems.add({ x, y, z, systemName, systemInfo });
                }
            });

            console.log("Finished adding system data");
            await db.config.put({ key: 'importDate', value: new Date().toISOString() }, 'importDate');
        } else {
            console.log('Database for layer', layer.name, 'already up-to-date.')
        }
    }

    static async syncEDSMLayer(layer: EDSMLayer) {
        const db = new EDSMLayerDB(layer.name); //by instantiating we auto upgrade it.
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
        const db = new EDSMLayerDB(layer.name);

        const tx = db.transaction('rw', db.systems, async () => {
            for (const system of systems) {
                db.systems.add(system);
            }
        });


        await db.config.put({ key: 'importDate', value: new Date().toISOString() }, 'importDate');
    }

    static createEDSMPoints(systems: any[], material: THREE.PointsMaterial, box: BoundingBox, layer: EDSMLayer): THREE.Points {
        let geom = new THREE.BufferGeometry();

        let positions = [];
        let colors = [];
        let dbSystems: SystemData[] = [];

        for (let system of systems) {
            positions = [...positions, system.coords.x, system.coords.y, system.coords.z];
            colors = [...colors, 0.7, 0.7, 0.7];
            const { name, coords, ...systemInfo } = system;
            dbSystems.push({ x: coords.x, y: coords.y, z: coords.z, systemName: name, systemInfo });
        }

        LayerDataService.storeEDSMSystems(dbSystems, layer);

        let point = new THREE.Points(geom,);
        point.userData = { source: 'EDSM', box, layer };
        point.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        point.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        point.geometry.attributes.color.needsUpdate = true;
        point.geometry.attributes.position.needsUpdate = true;
        return point;
    }

    static async getEDSMLayer(layer: EDSMLayer, sphere: BoundingSphere): Promise<THREE.Group | void> {
        console.log("Getting EDSM systems");
        console.log("for layer", layer, "and sphere", sphere)
        const endpoint = 'https://www.edsm.net/api-v1/cube-systems';

        let boxes: BoundingBox[] = [];
        const max_radius = 100; // defined by EDSM
        const total_max_radius = 1000;
        const material = LayerDataService.getSystemMaterial(8);
        let geom_group = new THREE.Group();

        if (sphere.radius > total_max_radius) {
            console.warn("Radius", sphere.radius, "too large. Limiting it to", total_max_radius);
        }
        sphere.radius = Math.min(sphere.radius, total_max_radius);


        // If we want to fetch a larger box than EDSM allows, split the request up in multiple requests
        // of smaller boxes
        if (sphere.radius > max_radius) {
            let num_divisions = Math.ceil(sphere.radius / max_radius);
            let x: number, y: number, z: number;
            for (let i = num_divisions / 2; i > -num_divisions / 2; i--) {
                x = sphere.center.x + max_radius * 2 * i - max_radius;
                for (let j = num_divisions / 2; j > -num_divisions / 2; j--) {
                    y = sphere.center.y + max_radius * 2 * j - max_radius;
                    for (let k = num_divisions / 2; k > -num_divisions / 2; k--) {
                        z = sphere.center.z + max_radius * 2 * k - max_radius;
                        boxes.push({ size: max_radius * 2, center: { x, y, z } })
                    }
                }
            }
        }
        else {
            boxes.push({ size: sphere.radius * 2, center: sphere.center })
        }
        console.log("Using boxes", boxes);


        const fetchSystems = async (boxes: BoundingBox[]) => {

            const cb = async (res: Response, bb: BoundingBox, start: Date): Promise<boolean> => {
                if (!res.ok) {
                    console.error("Error loading EDSMLayer", layer, "error", res.status, res.statusText);
                    return false;
                }
                const json = await res.json();
                console.log("Got systems", json);
                const limit = parseFloat(res.headers.get('x-rate-limit-limit'));
                const reset = parseFloat(res.headers.get('x-rate-limit-reset'));
                const duration = (new Date().getTime() - start.getTime()) / 1000;
                //we are allowed reset/limit seconds per request, and this request took duration seconds
                if (isNaN(limit) || isNaN(reset)) {
                    throw ("No rate limiting could be detected");
                }
                const wait_time = reset / limit - duration;

                if (wait_time > 60) {
                    throw (`EDSM requests limit exceeded. Wait time: ${wait_time}`);
                }

                if (!(json instanceof Array)) {
                    console.log("No systems found");
                    return await new Promise(resolve => { setTimeout(resolve, wait_time * 1000, true) });
                }
                const point = LayerDataService.createEDSMPoints(json, material, bb, layer);
                if (point instanceof THREE.Points) {
                    geom_group.add(point);
                }
                return await new Promise(resolve => { setTimeout(resolve, wait_time * 1000, true) });
            }

            const failed_boxes: BoundingBox[] = [];
            const num_parallel_requests = 10;

            while (boxes.length) {

                const next_boxes = boxes.splice(0, num_parallel_requests)
                const promises: Promise<boolean>[] = [];
                for (const bb of next_boxes) {
                    let url = new URL(endpoint);
                    url.search = new URLSearchParams({
                        ...layer.parameters,
                        x: bb.center.x.toString(),
                        y: bb.center.y.toString(),
                        z: bb.center.z.toString(),
                        size: bb.size.toString(),
                    }).toString();
                    const start = new Date();
                    promises.push(fetch(url.toString()).then((res) => { return cb(res, bb, start); }));
                }

                const results = await Promise.all(promises);
                for (const i in results) {
                    if (!results[i]) {
                        failed_boxes.push(next_boxes[i]);
                    }
                }
            }

            console.log("Failed for boxes", failed_boxes);
        }
        fetchSystems(boxes);
        return geom_group;

    }
}