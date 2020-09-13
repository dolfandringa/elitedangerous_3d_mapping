import * as THREE from 'three';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader';
import { BufferGeometry } from 'three';
import {
  JSONPCDLayerDB, EDSMLayerDB, SectorDB, SectorUpdateInfo,
} from '../db';
import {ungzip} from 'pako';
import {
  JSONPCDLayer,
  System,
  Layer,
  Coordinates,
  EDSMLayer,
  BoundingSphere,
  Sector,
} from '../types';

type GeomType = THREE.Points | THREE.Mesh | THREE.Line | THREE.Group;

export class LayerDataService {
  static async syncLayer(layer: Layer) {
    if (layer instanceof JSONPCDLayer) {
      await LayerDataService.syncJSONPCDLayer(layer);
    } else if (layer instanceof EDSMLayer) {
      await LayerDataService.syncEDSMLayer(layer);
    }
  }

  static async syncSectorsTable() {
    const db = new SectorDB();
    const importDate = (
      (await db.config.get('importDate')) || { value: undefined }
    ).value;
    const jsonFilename = 'sectors.json';
    let res = await fetch(jsonFilename, {
      cache: 'no-cache',
      method: 'HEAD',
    });
    const lastModified = new Date(res.headers.get('Last-Modified'));
    if (!importDate || new Date(importDate) < lastModified) {
      res = await fetch(jsonFilename, {
        cache: 'no-cache',
        method: 'GET',
      });
      console.log('importing data');
      await db.config.clear();
      await db.sectors.clear();
      const json = await res.json();
      await db.transaction('rw', db.sectors, async () => {
        json.apply((sector: Sector) => {
          db.sectors.add(sector);
        });
      });

      console.log('Finished adding system data');
      await db.config.put(
        { key: 'importDate', value: new Date().toISOString() },
        'importDate',
      );
      await db.config.put({ key: 'ready', value: '1' }, 'ready');
    } else {
      console.log('Sectors database already up-to-date.');
    }
  }

  static async syncJSONPCDLayer(layer: JSONPCDLayer) {
    const db = new JSONPCDLayerDB(layer.name);
    const import_date = (
      (await db.config.get('importDate')) || { value: undefined }
    ).value;
    const json_filename = `${layer.name}.json`;
    const res = await fetch(json_filename, {
      cache: 'no-cache',
      method: 'HEAD',
    });
    const last_modified = new Date(res.headers.get('Last-Modified'));
    if (!import_date || new Date(import_date) < last_modified) {
      const res = await fetch(json_filename, {
        cache: 'no-cache',
        method: 'GET',
      });
      console.log('importing data');
      await db.systems.clear();
      const json = await res.json();
      await db.transaction('rw', db.systems, async () => {
        for (const system of json) {
          const {
            x, y, z, systemName, ...systemInfo
          } = system;
          db.systems.add({
            x,
            y,
            z,
            systemName,
            systemInfo,
          });
        }
      });

      console.log('Finished adding system data');
      await db.config.put(
        { key: 'importDate', value: new Date().toISOString() },
        'importDate',
      );
    } else {
      console.log('Database for layer', layer.name, 'already up-to-date.');
    }
  }

  static async updateEDSMSector(sector: SectorUpdateInfo, db: EDSMLayerDB) {
    const updatedDate = sector.updatedDate;
    const [sx, sy, sz] = sector.sector_number;
    const jsonFilename = `edsm/${sx}/${sy}/${sx}_${sy}_${sz}.json.gz`;
    let res = await fetch(jsonFilename, {
      cache: 'no-cache',
      method: 'HEAD',
    });
    const lastModified = new Date(res.headers.get('Last-Modified'));
    if (!updatedDate || new Date(updatedDate) < lastModified) {
      res = await fetch(jsonFilename, {
        cache: 'no-cache',
        method: 'GET',
      });
      console.log('importing data');
      await db.systems.where('sector_number').equals(sector.sector_number).delete();
      const json = JSON.parse(ungzip(new Uint8Array(await res.arrayBuffer()),
                                     {to: 'string'}));
      await db.transaction('rw', db.systems, async () => {
        json.apply((sector: Sector) => {
          db.sectors.add(sector);
        });
      });

      console.log('Finished adding system data');
      await db.config.put(
        { key: 'importDate', value: new Date().toISOString() },
        'importDate',
      );
      await db.config.put({ key: 'ready', value: '1' }, 'ready');
    } else {
      console.log('Sectors database already up-to-date.');
    }

  }

  static async syncEDSMLayer(layer: EDSMLayer) {
    const db = new EDSMLayerDB(layer.name); // by instantiating we auto upgrade it.
    db.sectors.orderBy('lastLoadedDate').reverse().each(sector => LayerDataService.updateEDSMSector(sector, db));
  }

  static async getLayer(
    layer: Layer,
    sphere: BoundingSphere,
  ): Promise<GeomType | void> {
    if (layer instanceof JSONPCDLayer) {
      return await LayerDataService.getJSONPCDLayer(layer);
    }
    if (layer instanceof EDSMLayer) {
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

  static getJSONPCDLayer(
    layer: JSONPCDLayer,
  ): Promise<THREE.Points | void> {
    const loader = new PCDLoader();
    return new Promise((resolve, reject) => {
      try {
        loader.load(
          `${layer.name}.pcd`,
          (points: THREE.Points<BufferGeometry>) => {
            points.layers.set(0);

            const numPoints = points.geometry.attributes.position.count;
            const colors = [];
            const sizes = [];
            for (let i = 0; i < numPoints; i += 1) {
              sizes.push(10);
              colors.push(0.8, 0.8, 0.8);
            }
            points.geometry.setAttribute(
              'size',
              new THREE.Float32BufferAttribute(sizes, 1),
            );
            points.geometry.setAttribute(
              'color',
              new THREE.Float32BufferAttribute(colors, 3),
            );
            points.material = LayerDataService.getSystemMaterial();
            points.geometry.computeBoundingBox();
            resolve(points);
          },
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  static async storeEDSMSystems(
    systems: System[],
    sector: Sector,
    layer: Layer,
  ) {
    const db = new EDSMLayerDB(layer.name);

    db.transaction('rw', db.systems, async () => {
      for( const system of systems) {
        db.systems.add({ sector: sector.sector_number, ...system });
      }
    });

    await db.config.put(
      { key: 'importDate', value: new Date().toISOString() },
      'importDate',
    );
  }

  static createEDSMPoints(
    systems: System[],
    material: THREE.PointsMaterial,
    sector: Sector,
    layer: EDSMLayer,
  ): THREE.Points {
    const geom = new THREE.BufferGeometry();

    let positions = [];
    let colors = [];

    for(const system of systems) {
      positions = [...positions, system.x, system.y, system.z];
      colors = [...colors, 0.7, 0.7, 0.7];
    }

    const point = new THREE.Points(geom, material);
    point.userData = { source: 'EDSM', sector, layer };
    point.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    point.geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3),
    );
    point.geometry.attributes.color.needsUpdate = true;
    point.geometry.attributes.position.needsUpdate = true;
    return point;
  }

  static getSectorForCoords(coords: Coordinates): Sector {
    const sector0Origin = { x: -49985, y: -40985, z: -24105 };
    const x = Math.floor((coords.x - sector0Origin.x) / 1280);
    const y = Math.floor((coords.y - sector0Origin.y) / 1280);
    const z = Math.floor((coords.z - sector0Origin.z) / 1280);
    return {
      sector_number: [x, y, z],
      min: {
        x: (x + sector0Origin.x) * 1280,
        y: (y + sector0Origin.y) * 1280,
        z: (z + sector0Origin.z) * 1280,
      },
      max: {
        x: (x + sector0Origin.x) * 1280 + 1280,
        y: (y + sector0Origin.y) * 1280 + 1280,
        z: (z + sector0Origin.z) * 1280 + 1280,
      },
      center: {
        x: (x + sector0Origin.x) * 1280 + 640,
        y: (y + sector0Origin.y) * 1280 + 640,
        z: (z + sector0Origin.z) * 1280 + 640,
      },
    };
  }

  static async getEDSMLayer(
    layer: EDSMLayer,
    sphere: BoundingSphere,
  ): Promise<THREE.Group | void> {
    console.log('Getting EDSM systems');
    console.log('for layer', layer, 'and sphere', sphere);

    const sectors: Sector[] = [];
    const totalMaxRadius = 500;
    const material = LayerDataService.getSystemMaterial(8);
    const geomGroup = new THREE.Group();

    if (sphere.radius > totalMaxRadius) {
      console.warn(
        'Radius',
        sphere.radius,
        'too large. Limiting it to',
        totalMaxRadius,
      );
      sphere.radius = totalMaxRadius;
    }

    sectors.push(LayerDataService.getSectorForCoords(sphere.center));
    if (sphere.center.x + sphere.radius > sectors[0].max.x) {
      sectors.push(
        LayerDataService.getSectorForCoords({
          x: sphere.center.x + sphere.radius,
          y: sphere.center.y,
          z: sphere.center.z,
        }),
      );
    }
    if (sphere.center.x - sphere.radius < sectors[0].min.x) {
      sectors.push(
        LayerDataService.getSectorForCoords({
          x: sphere.center.x - sphere.radius,
          y: sphere.center.y,
          z: sphere.center.z,
        }),
      );
    }
    if (sphere.center.y + sphere.radius > sectors[0].max.y) {
      sectors.push(
        LayerDataService.getSectorForCoords({
          x: sphere.center.x,
          y: sphere.center.y + sphere.radius,
          z: sphere.center.z,
        }),
      );
    }
    if (sphere.center.y - sphere.radius < sectors[0].min.y) {
      sectors.push(
        LayerDataService.getSectorForCoords({
          x: sphere.center.x,
          y: sphere.center.y - sphere.radius,
          z: sphere.center.z,
        }),
      );
    }
    if (sphere.center.z + sphere.radius > sectors[0].max.z) {
      sectors.push(
        LayerDataService.getSectorForCoords({
          x: sphere.center.x,
          y: sphere.center.y,
          z: sphere.center.z + sphere.radius,
        }),
      );
    }
    if (sphere.center.z - sphere.radius < sectors[0].min.z) {
      sectors.push(
        LayerDataService.getSectorForCoords({
          x: sphere.center.x,
          y: sphere.center.y,
          z: sphere.center.z - sphere.radius,
        }),
      );
    }

    console.log('Getting data for sectors', sectors);

    const fetchSystems = async (sectors: Sector[]) => {
      const cb = async (
        res: Response,
        sector: Sector,
        start: Date,
      ): Promise<boolean> => {
        if (!res.ok) {
          console.error(
            'Error loading EDSMLayer',
            layer,
            'error',
            res.status,
            res.statusText,
          );
          return false;
        }
        const json = await res.json();
        console.log('Got systems', json);
        const limit = parseFloat(res.headers.get('x-rate-limit-limit'));
        const reset = parseFloat(res.headers.get('x-rate-limit-reset'));
        const duration = (new Date().getTime() - start.getTime()) / 1000;
        // we are allowed reset/limit seconds per request, and this request took duration seconds
        if (isNaN(limit) || isNaN(reset)) {
          throw new Error('No rate limiting could be detected');
        }
        const waitTime = reset / limit - duration;

        if (waitTime > 60) {
          throw new Error(`EDSM requests limit exceeded. Wait time: ${waitTime}`);
        }

        if (!(json instanceof Array)) {
          console.log('No systems found');
          return new Promise((resolve) => {
            setTimeout(resolve, waitTime * 1000, true);
          });
        }
        const point = LayerDataService.createEDSMPoints(
          json,
          material,
          sector,
          layer,
        );
        if (point instanceof THREE.Points) {
          geomGroup.add(point);
        }
        return new Promise((resolve) => {
          setTimeout(resolve, waitTime * 1000, true);
        });
      };

      const failedSectors: Sector[] = [];
      const numParallelRequests = 4;

      while (sectors.length) {
        const nextBoxes = sectors.splice(0, numParallelRequests);
        const promises: Promise<boolean>[] = [];
        for (const bb of nextBoxes) {
          const url = new URL(endpoint);
          url.search = new URLSearchParams({
            ...layer.parameters,
            x: bb.center.x.toString(),
            y: bb.center.y.toString(),
            z: bb.center.z.toString(),
            size: bb.size.toString(),
          }).toString();
          const start = new Date();
          promises.push(
            fetch(url.toString()).then((res) => cb(res, bb, start)),
          );
        }

        const results = await Promise.all(promises);
        for (const i in results) {
          if (!results[i]) {
            failedSectors.push(nextBoxes[i]);
          }
        }
      }

      console.log('Failed for boxes', failedSectors);
    };
    fetchSystems(sectors);
    return geomGroup;
  }
}
