
export interface Color {
  r: number;
  g: number;
  b: number;
}

export interface Coordinates {
  x: number;
  y: number;
  z: number;
}

export interface BoundingSphere {
  radius: number;
  center: Coordinates;
}

export interface BoundingBox {
  min: Coordinates;
  max: Coordinates;
}

export interface Sector {
  id?: number;
  // eslint-disable-next-line camelcase
  sector_number: number[];
  center: Coordinates;
  min: Coordinates;
  max: Coordinates;
  sectorName?: string;
}

export interface System {
    id?: number;
    x: number;
    y: number;
    z: number;
    sector?: number[];
    systemName: string;
    systemInfo?: object;
}
