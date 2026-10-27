import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { ZoneId } from '@shared/types';
import { GRID_H, GRID_W, ZONES, zoneIndexOfCell } from '@shared/zones';
import { heatColor } from '../../utils/thermalColors';
import { FLOOR_D, FLOOR_W } from './layout';

const CELL_ZONE = Array.from({ length: GRID_W * GRID_H }, (_, i) =>
  ZONES[zoneIndexOfCell(i % GRID_W, Math.floor(i / GRID_W))]);

const noRaycast = () => undefined;

interface Props {
  values: number[];
  ambient: number;
  nominal: Record<ZoneId, number>;
}

/**
 * The thermal view is ONE textured plane (40 x 25 pixels) lying just above the floor.
 * The texture is rewritten from the server's grid on every snapshot, so there are no
 * per-cell React components or meshes.
 */
export function ThermalOverlay({ values, ambient, nominal }: Props) {
  const texture = useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array(GRID_W * GRID_H * 4), GRID_W, GRID_H, THREE.RGBAFormat);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, []);

  useEffect(() => {
    const data = texture.image.data as Uint8Array;
    for (let gy = 0; gy < GRID_H; gy++) {
      // texture row 0 is the +z (south) edge of the plane, grid row 0 is the north edge
      const row = GRID_H - 1 - gy;
      for (let gx = 0; gx < GRID_W; gx++) {
        const i = gy * GRID_W + gx;
        const zone = CELL_ZONE[i];
        const [r, g, b] = heatColor(values[i], zone, nominal[zone.id], ambient);
        const o = (row * GRID_W + gx) * 4;
        data[o] = r;
        data[o + 1] = g;
        data[o + 2] = b;
        data[o + 3] = 255;
      }
    }
    texture.needsUpdate = true;
  }, [values, ambient, nominal, texture]);

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.07, 0]} raycast={noRaycast}>
      <planeGeometry args={[FLOOR_W, FLOOR_D]} />
      <meshBasicMaterial map={texture} transparent opacity={0.93} toneMapped={false} />
    </mesh>
  );
}
