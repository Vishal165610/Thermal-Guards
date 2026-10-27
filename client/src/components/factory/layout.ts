import { GRID_H, GRID_W, type ZoneConfig } from '@shared/zones';

// 1 grid cell = CELL world units. The thermal grid lies exactly on the factory floor.
export const CELL = 0.6;
export const FLOOR_W = GRID_W * CELL; // 24
export const FLOOR_D = GRID_H * CELL; // 15

export function zoneRect(z: ZoneConfig) {
  return {
    cx: ((z.x0 + z.x1) / 2) * CELL - FLOOR_W / 2,
    cz: ((z.y0 + z.y1) / 2) * CELL - FLOOR_D / 2,
    w: (z.x1 - z.x0) * CELL,
    d: (z.y1 - z.y0) * CELL,
  };
}
