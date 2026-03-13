// ---------------------------------------------------------------------------
// Per-Character Manifest — lifecycle tracking for AI-generated sprite assets
// ---------------------------------------------------------------------------

export type FrameStatus = "pending" | "generating" | "generated";
export type FrameSource = "ai" | "manual" | "placeholder";
export type DirectionCode = "S" | "N" | "E" | "W";
export type AnimState = "idle" | "walk" | "run";
export type ViewDirection = "front" | "back" | "right" | "left";
export type PipelineStage = 'pending' | 'pass1' | 'pass1_edited' | 'pass2' | 'pass2_edited' | 'pass3';

export const VIEW_DIRECTIONS: ViewDirection[] = ["front", "back", "right", "left"];

export const DIRECTION_TO_VIEW: Record<DirectionCode, ViewDirection> = {
  S: "front",
  N: "back",
  E: "right",
  W: "left",
};

/** Returns the concept image filename for a given view direction. */
export function conceptImageForView(view: ViewDirection): string {
  return `concept_${view}.png`;
}

/** Returns the chibi image filename for a given view direction. */
export function chibiImageForView(view: ViewDirection): string {
  return `chibi_${view}.png`;
}

export interface FrameGeneration {
  prompt: string;
  seed?: number;
  steps?: number;
  cfg?: number;
  model?: string;
}

export interface FrameReview {
  reviewer: string; // "human" | "auto"
  notes: string;
  quality_score?: number;
}

export interface CharacterFrame {
  index: number;
  tile_id: number;
  duration: number;
  status: FrameStatus;
  source: FrameSource;
  file: string; // relative path within character directory
  pipeline_stage?: PipelineStage;
  keyframe?: boolean;
  generation?: FrameGeneration;
  review?: FrameReview;
}

export interface CharacterAnimation {
  name: string; // e.g. "idle_down"
  state: AnimState;
  direction: DirectionCode;
  row: number;
  loop: boolean;
  frames: CharacterFrame[];
}

export interface StageGenerationSettings {
  checkpoint?: string;
  vae?: string;
  steps?: number;
  cfg?: number;
  sampler?: string;
  scheduler?: string;
  seed?: number;
  denoise?: number;
  loras?: { name: string; weight: number }[];
  ipAdapterWeight?: number;
  ipAdapterEndAt?: number;
}

export interface ConceptArt {
  description: string;
  style_prompt: string;
  negative_prompt: string;
  reference_images: string[]; // relative paths
  generation_settings?: StageGenerationSettings;
}

export interface SpritesheetConfig {
  frame_width: number;
  frame_height: number;
  columns: number;
  interp_multiplier?: number; // interpolation multiplier (2/3/4), default 1 (no interpolation)
}

export interface AtlasInfo {
  file: string;
  normal_map?: string;
  width: number;
  height: number;
}

export interface ChibiArt {
  style_prompt: string;
  negative_prompt: string;
  reference_image: string;  // "chibi.png"
  reference_images?: Partial<Record<ViewDirection, string>>;  // per-view chibi images
  generation_settings?: StageGenerationSettings;
}

export interface PixelArt {
  style_prompt: string;
  negative_prompt: string;
  reference_image: string;  // "pixel.png"
  generation_settings?: StageGenerationSettings;
}

export interface CharacterManifest {
  version: number;
  character_id: string;
  display_name: string;
  concept: ConceptArt;
  chibi?: ChibiArt;
  pixel?: PixelArt;
  spritesheet: SpritesheetConfig;
  animations: CharacterAnimation[];
  atlas?: AtlasInfo;
}

// Engine-consumable animation definition (derived from manifest by assembler)
export interface EngineClipFrame {
  tile_id: number;
  duration: number;
}

export interface EngineClip {
  name: string;
  loop: boolean;
  frames: EngineClipFrame[];
}

export interface EngineTileset {
  tile_width: number;
  tile_height: number;
  columns: number;
  sheet_width: number;
  sheet_height: number;
}

export interface EngineAnimations {
  character_id: string;
  tileset: EngineTileset;
  clips: EngineClip[];
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

const STATES: AnimState[] = ["idle", "walk", "run"];
const DIRECTIONS: DirectionCode[] = ["S", "N", "E", "W"];
const DIR_NAMES: Record<DirectionCode, string> = { S: "down", N: "up", E: "right", W: "left" };
const STATE_DURATIONS: Record<AnimState, number> = { idle: 0.30, walk: 0.12, run: 0.07 };

export function createDefaultManifest(
  characterId: string,
  displayName: string,
  frameWidth = 128,
  frameHeight = 128,
  columns = 4,
  framesPerClip = 4,
  interpMultiplier = 1,
): CharacterManifest {
  const mult = Math.max(1, Math.round(interpMultiplier));
  // Each keyframe is followed by (mult-1) interp slots; for looping anims the
  // last keyframe also wraps back to the first, so it gets slots too.
  const totalFramesPerClip = framesPerClip * mult;
  const effectiveColumns = mult > 1 ? totalFramesPerClip : columns;
  const animations: CharacterAnimation[] = [];
  let row = 0;

  for (const state of STATES) {
    for (const dir of DIRECTIONS) {
      const name = `${state}_${DIR_NAMES[dir]}`;
      const frames: CharacterFrame[] = [];
      let frameIdx = 0;
      for (let f = 0; f < framesPerClip; f++) {
        // Keyframe
        frames.push({
          index: frameIdx,
          tile_id: row * effectiveColumns + frameIdx,
          duration: STATE_DURATIONS[state] / mult,
          status: "pending",
          source: "placeholder",
          file: `${state}_${dir}_f${frameIdx}.png`,
          keyframe: true,
        });
        frameIdx++;

        // Interpolation placeholders after each keyframe (including the last
        // one, since all animations loop and need last→first interpolation)
        for (let j = 0; j < mult - 1; j++) {
          frames.push({
            index: frameIdx,
            tile_id: row * effectiveColumns + frameIdx,
            duration: STATE_DURATIONS[state] / mult,
            status: "pending",
            source: "placeholder",
            file: `${state}_${dir}_f${frameIdx}.png`,
            keyframe: false,
          });
          frameIdx++;
        }
      }
      animations.push({ name, state, direction: dir, row, loop: true, frames });
      row++;
    }
  }

  return {
    version: 1,
    character_id: characterId,
    display_name: displayName,
    concept: {
      description: "",
      style_prompt: "game character sprite, clean design, simple shading",
      negative_prompt: "blurry, realistic, 3d render, watercolor, line art, sketch",
      reference_images: [],
    },
    spritesheet: {
      frame_width: frameWidth,
      frame_height: frameHeight,
      columns: effectiveColumns,
      ...(mult > 1 ? { interp_multiplier: mult } : {}),
    },
    animations,
  };
}

// Manifest statistics
export interface ManifestStats {
  total: number;
  pending: number;
  generating: number;
  generated: number;
}

export function getManifestStats(manifest: CharacterManifest): ManifestStats {
  const stats: ManifestStats = {
    total: 0, pending: 0, generating: 0, generated: 0,
  };
  for (const anim of manifest.animations) {
    for (const frame of anim.frames) {
      stats.total++;
      stats[frame.status]++;
    }
  }
  return stats;
}
