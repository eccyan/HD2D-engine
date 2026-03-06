import type { EditTarget, ActiveLayer, PixelData, HeightmapData } from '../store/usePainterStore.js';
import type { AssetManifest } from '@vulkan-game-tools/asset-types';

// ---------------------------------------------------------------------------
// Available samplers (exported for ai_get_config)
// ---------------------------------------------------------------------------

export const SAMPLER_NAMES = [
  'euler',
  'euler_ancestral',
  'dpmpp_2m',
  'dpmpp_sde',
  'ddim',
  'uni_pc',
] as const;

export const DEFAULT_NEGATIVE_PROMPT =
  'smooth, realistic, 3d render, blurry, soft, high resolution, photorealistic, anti-aliasing, gradient, watercolor';

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

export interface PromptContext {
  prompt: string;
  editTarget: EditTarget;
  manifest: AssetManifest;
  col: number;
  row: number;
  targetW: number;
  targetH: number;
  activeLayer: ActiveLayer;
}

export function buildFullPrompt(ctx: PromptContext): string {
  const slotLabel = ctx.editTarget === 'tileset'
    ? ctx.manifest.tileset.slots.find(
        (s) => s.id === ctx.row * ctx.manifest.tileset.columns + ctx.col,
      )?.label
    : ctx.manifest.spritesheet.rows.find((r) => r.row === ctx.row)?.label;

  const target = ctx.editTarget === 'tileset'
    ? `${ctx.targetW}x${ctx.targetH} pixel art tile, tile (${ctx.col},${ctx.row})${slotLabel ? ` "${slotLabel}"` : ''}`
    : `${ctx.targetW}x${ctx.targetH} pixel art sprite frame, ${slotLabel ?? `row ${ctx.row}`} frame ${ctx.col}`;

  const heightmapSuffix = ctx.activeLayer === 'heightmap'
    ? ', height map, white=high black=low, grayscale, depth map'
    : ', pixel art, 8-bit, 16-bit, low-res, retro game graphics, NES palette, clean edges, game asset';

  return `${ctx.prompt}, ${target}${heightmapSuffix}`;
}

export function buildNegativePrompt(negativePrompt?: string): string {
  if (negativePrompt) {
    return `${negativePrompt}, watermark, text, signature`;
  }
  return 'smooth, realistic, 3d render, blurry, soft, high resolution, photorealistic, watermark, text, signature';
}

// ---------------------------------------------------------------------------
// Image processing (browser-only — uses canvas)
// ---------------------------------------------------------------------------

export async function downscaleToPixelData(
  pngBytes: Uint8Array,
  targetW: number,
  targetH: number,
): Promise<PixelData> {
  const blob = new Blob([pngBytes], { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load generated image'));
      img.src = url;
    });

    const offscreen = document.createElement('canvas');
    offscreen.width = targetW;
    offscreen.height = targetH;
    const ctx = offscreen.getContext('2d')!;
    ctx.imageSmoothingEnabled = false; // nearest-neighbor
    ctx.drawImage(img, 0, 0, targetW, targetH);
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    return new Uint8ClampedArray(imgData.data) as PixelData;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------------------------------------------------------------------------
// Heightmap extraction
// ---------------------------------------------------------------------------

export function pixelsToHeightmap(
  pixels: PixelData,
  w: number,
  h: number,
): HeightmapData {
  const hm = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) {
    hm[i] = pixels[i * 4]; // R channel
  }
  return hm as HeightmapData;
}
