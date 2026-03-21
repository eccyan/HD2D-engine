import type { VoxelKey } from '../store/types.js';

export function voxelKey(x: number, y: number, z: number): VoxelKey {
  return `${x},${y},${z}`;
}

export function parseKey(key: VoxelKey): [number, number, number] {
  const parts = key.split(',');
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

export function brushPositions(
  cx: number,
  cy: number,
  cz: number,
  size: number,
): [number, number, number][] {
  const positions: [number, number, number][] = [];
  const r = Math.floor(size / 2);
  for (let dx = -r; dx <= r; dx++) {
    for (let dz = -r; dz <= r; dz++) {
      positions.push([cx + dx, cy, cz + dz]);
    }
  }
  return positions;
}
