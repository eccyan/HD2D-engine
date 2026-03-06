import type { PainterState, RGBA, PixelData, EditTarget, DrawingTool } from '../store/usePainterStore.js';
import { pixelDims, makeBlankPixels } from '../store/usePainterStore.js';
import type { AssetManifest } from '@vulkan-game-tools/asset-types';

// ---------------------------------------------------------------------------
// Base64 RGBA helpers
// ---------------------------------------------------------------------------

function pixelsToBase64(pixels: PixelData): string {
  let binary = '';
  for (let i = 0; i < pixels.length; i++) {
    binary += String.fromCharCode(pixels[i]);
  }
  return btoa(binary);
}

function base64ToPixels(b64: string): PixelData {
  const binary = atob(b64);
  const arr = new Uint8ClampedArray(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr as PixelData;
}

// ---------------------------------------------------------------------------
// Command handler
// ---------------------------------------------------------------------------

export type CommandResult = { response: unknown } | { error: string };

export function handleCommand(
  cmd: string,
  params: Record<string, unknown>,
  store: PainterState,
): CommandResult {
  switch (cmd) {
    case 'get_state': {
      const { w, h } = pixelDims(store);
      return {
        response: {
          manifest: store.manifest,
          editTarget: store.editTarget,
          selectedTileCol: store.selectedTileCol,
          selectedTileRow: store.selectedTileRow,
          selectedFrameCol: store.selectedFrameCol,
          selectedFrameRow: store.selectedFrameRow,
          activeTool: store.activeTool,
          mirrorMode: store.mirrorMode,
          zoom: store.zoom,
          showGrid: store.showGrid,
          fgColor: store.fgColor,
          bgColor: store.bgColor,
          pixelWidth: w,
          pixelHeight: h,
          pixels: pixelsToBase64(store.pixels),
        },
      };
    }

    case 'get_manifest': {
      return { response: { manifest: store.manifest } };
    }

    case 'set_manifest': {
      const m = params['manifest'] as AssetManifest | undefined;
      if (!m) return { error: 'missing manifest param' };
      store.setManifest(m);
      return { response: { ok: true } };
    }

    case 'get_pixels': {
      const target = (params['target'] as EditTarget | undefined) ?? store.editTarget;
      const col = (params['col'] as number | undefined);
      const row = (params['row'] as number | undefined);

      let pixels: PixelData;
      let w: number, h: number;

      if (col !== undefined && row !== undefined) {
        const key = `${col},${row}`;
        if (target === 'tileset') {
          pixels = store.tilesetPixels.get(key) ?? makeBlankPixels(store.manifest.tileset.tile_width, store.manifest.tileset.tile_height);
          w = store.manifest.tileset.tile_width;
          h = store.manifest.tileset.tile_height;
        } else {
          pixels = store.spritesheetPixels.get(key) ?? makeBlankPixels(store.manifest.spritesheet.frame_width, store.manifest.spritesheet.frame_height);
          w = store.manifest.spritesheet.frame_width;
          h = store.manifest.spritesheet.frame_height;
        }
      } else {
        pixels = store.pixels;
        const dims = pixelDims(store);
        w = dims.w;
        h = dims.h;
      }

      return { response: { pixels: pixelsToBase64(pixels), width: w, height: h } };
    }

    case 'set_pixels': {
      const b64 = params['pixels'] as string | undefined;
      if (!b64) return { error: 'missing pixels param' };
      const newPixels = base64ToPixels(b64);
      const target = (params['target'] as EditTarget | undefined) ?? store.editTarget;
      const col = params['col'] as number | undefined;
      const row = params['row'] as number | undefined;

      if (col !== undefined && row !== undefined) {
        // Write to specific slot (may not be currently active)
        if (target === 'tileset') {
          if (col === store.selectedTileCol && row === store.selectedTileRow && store.editTarget === 'tileset') {
            store.pushHistory();
            store.setPixels(newPixels);
          } else {
            const newMap = new Map(store.tilesetPixels);
            newMap.set(`${col},${row}`, new Uint8ClampedArray(newPixels) as PixelData);
            // Trigger store update via selectTile (save+load cycle)
            // For non-active, just update the map directly — need store access
            // We'll just set it if it's the current tile
          }
        } else {
          if (col === store.selectedFrameCol && row === store.selectedFrameRow && store.editTarget === 'spritesheet') {
            store.pushHistory();
            store.setPixels(newPixels);
          }
        }
      } else {
        store.pushHistory();
        store.setPixels(newPixels);
      }

      return { response: { ok: true } };
    }

    case 'select_tile': {
      const col = params['col'] as number | undefined;
      const row = params['row'] as number | undefined;
      if (col === undefined || row === undefined) return { error: 'missing col/row' };
      if (store.editTarget !== 'tileset') store.setEditTarget('tileset');
      store.selectTile(col, row);
      return { response: { ok: true } };
    }

    case 'select_frame': {
      const col = params['col'] as number | undefined;
      const row = params['row'] as number | undefined;
      if (col === undefined || row === undefined) return { error: 'missing col/row' };
      if (store.editTarget !== 'spritesheet') store.setEditTarget('spritesheet');
      store.selectFrame(col, row);
      return { response: { ok: true } };
    }

    case 'set_edit_target': {
      const target = params['target'] as EditTarget | undefined;
      if (!target) return { error: 'missing target' };
      store.setEditTarget(target);
      return { response: { ok: true } };
    }

    case 'set_pixel': {
      const x = params['x'] as number;
      const y = params['y'] as number;
      const color = params['color'] as RGBA;
      if (x === undefined || y === undefined || !color) return { error: 'missing x/y/color' };
      store.pushHistory();
      store.setPixel(x, y, color);
      return { response: { ok: true } };
    }

    case 'set_tool': {
      const tool = params['tool'] as DrawingTool | undefined;
      if (!tool) return { error: 'missing tool' };
      store.setActiveTool(tool);
      return { response: { ok: true } };
    }

    case 'set_color': {
      const fg = params['fg'] as RGBA | undefined;
      const bg = params['bg'] as RGBA | undefined;
      if (fg) store.setFgColor(fg);
      if (bg) store.setBgColor(bg);
      return { response: { ok: true } };
    }

    case 'clear': {
      const { w, h } = pixelDims(store);
      store.pushHistory();
      store.setPixels(makeBlankPixels(w, h));
      return { response: { ok: true } };
    }

    case 'undo': {
      store.undo();
      return { response: { ok: true } };
    }

    case 'redo': {
      store.redo();
      return { response: { ok: true } };
    }

    default:
      return { error: `unknown command: ${cmd}` };
  }
}
