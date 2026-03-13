/**
 * Export metadata types — engine-agnostic spritesheet/frame package metadata.
 */

export interface ExportFrameCoord {
  x: number;
  y: number;
  w: number;
  h: number;
  duration: number;
}

export interface ExportFrameFile {
  file: string;
  duration: number;
}

export interface ExportAnimation<F = ExportFrameCoord | ExportFrameFile> {
  name: string;
  loop: boolean;
  frames: F[];
}

export interface SpritesheetExportMetadata {
  version: 1;
  generator: 'seurat';
  character_id: string;
  display_name: string;
  spritesheet: string;
  frame_width: number;
  frame_height: number;
  sheet_width: number;
  sheet_height: number;
  columns: number;
  animations: ExportAnimation<ExportFrameCoord>[];
}

export interface IndividualExportMetadata {
  version: 1;
  generator: 'seurat';
  character_id: string;
  display_name: string;
  frame_width: number;
  frame_height: number;
  animations: ExportAnimation<ExportFrameFile>[];
}

export type ExportMetadata = SpritesheetExportMetadata | IndividualExportMetadata;
