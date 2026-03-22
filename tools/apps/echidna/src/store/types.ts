// ── Voxel ──

export interface Voxel {
  color: [number, number, number, number];
}

export type VoxelKey = `${number},${number},${number}`;

// ── Character ──

export interface BodyPart {
  id: string;
  parent: string | null;
  joint: [number, number, number];
  voxelKeys: VoxelKey[];
}

export interface PoseData {
  /** Per-part euler rotations in degrees [rx, ry, rz] */
  rotations: Record<string, [number, number, number]>;
}

export type ToolType =
  | 'place'
  | 'paint'
  | 'erase'
  | 'eyedropper'
  | 'assign_part';

// ── File format ──

export interface EchidnaFile {
  version: number;
  characterName: string;
  gridWidth: number;
  gridDepth: number;
  voxels: { x: number; y: number; z: number; r: number; g: number; b: number; a: number }[];
  parts: BodyPart[];
  poses: Record<string, PoseData>;
}

// ── Undo snapshot ──

export interface Snapshot {
  voxels: [VoxelKey, Voxel][];
  parts: BodyPart[];
}
