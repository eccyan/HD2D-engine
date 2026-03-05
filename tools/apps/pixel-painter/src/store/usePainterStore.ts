import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DrawingTool = 'pencil' | 'eraser' | 'line' | 'rect' | 'fill' | 'eyedropper';
export type MirrorMode = 'none' | 'horizontal' | 'vertical' | 'both';
export type EditTarget = 'tileset' | 'spritesheet';

/** RGBA color as [r, g, b, a] with values 0-255 */
export type RGBA = [number, number, number, number];

/** A 16x16 pixel canvas stored as flat RGBA array (4 bytes per pixel, 16*16*4 = 1024 bytes) */
export type PixelData = Uint8ClampedArray;

export interface HistoryEntry {
  pixels: PixelData;
}

export interface PainterState {
  // --- Current editing target ---
  editTarget: EditTarget;

  // --- Tileset editing (128x48, 8 cols x 3 rows of 16x16 tiles) ---
  selectedTileCol: number;
  selectedTileRow: number;
  tilesetPixels: Map<string, PixelData>; // key: "col,row"

  // --- Spritesheet editing (64x192, 4 cols x 12 rows of 16x16 frames) ---
  selectedFrameCol: number;
  selectedFrameRow: number;
  spritesheetPixels: Map<string, PixelData>; // key: "col,row"

  // --- Current pixel canvas (active tile/frame) ---
  pixels: PixelData;

  // --- Undo/redo ---
  history: HistoryEntry[];
  historyIndex: number;

  // --- Tools ---
  activeTool: DrawingTool;
  mirrorMode: MirrorMode;
  zoom: number;
  showGrid: boolean;

  // --- Colors ---
  fgColor: RGBA;
  bgColor: RGBA;
  recentColors: RGBA[];

  // --- Animation preview ---
  animPreviewFps: number;
  animPreviewPlaying: boolean;

  // --- UI state ---
  showAIPanel: boolean;

  // --- Actions ---
  setEditTarget: (target: EditTarget) => void;
  selectTile: (col: number, row: number) => void;
  selectFrame: (col: number, row: number) => void;
  setPixel: (x: number, y: number, color: RGBA) => void;
  setPixels: (newPixels: PixelData) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  setActiveTool: (tool: DrawingTool) => void;
  setMirrorMode: (mode: MirrorMode) => void;
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;
  setFgColor: (color: RGBA) => void;
  setBgColor: (color: RGBA) => void;
  swapColors: () => void;
  addRecentColor: (color: RGBA) => void;
  setAnimPreviewFps: (fps: number) => void;
  setAnimPreviewPlaying: (playing: boolean) => void;
  setShowAIPanel: (show: boolean) => void;
  applyAIPixels: (pixels: PixelData) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBlankPixels(): PixelData {
  // 16x16 transparent pixels
  return new Uint8ClampedArray(16 * 16 * 4);
}

function clonePixels(src: PixelData): PixelData {
  return new Uint8ClampedArray(src);
}

function getTileKey(col: number, row: number): string {
  return `${col},${row}`;
}

function colorsEqual(a: RGBA, b: RGBA): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const MAX_HISTORY = 50;
const MAX_RECENT_COLORS = 8;

export const usePainterStore = create<PainterState>((set, get) => ({
  editTarget: 'tileset',

  selectedTileCol: 0,
  selectedTileRow: 0,
  tilesetPixels: new Map(),

  selectedFrameCol: 0,
  selectedFrameRow: 0,
  spritesheetPixels: new Map(),

  pixels: makeBlankPixels(),

  history: [],
  historyIndex: -1,

  activeTool: 'pencil',
  mirrorMode: 'none',
  zoom: 24,
  showGrid: true,

  fgColor: [0, 0, 0, 255],
  bgColor: [255, 255, 255, 255],
  recentColors: [],

  animPreviewFps: 8,
  animPreviewPlaying: false,

  showAIPanel: false,

  // -------------------------------------------------------------------------
  setEditTarget: (target) => {
    const state = get();
    // Save current pixels back into map before switching
    if (state.editTarget === 'tileset') {
      const key = getTileKey(state.selectedTileCol, state.selectedTileRow);
      const newMap = new Map(state.tilesetPixels);
      newMap.set(key, clonePixels(state.pixels));
      const newKey = getTileKey(state.selectedTileCol, state.selectedTileRow);
      set({ editTarget: target, tilesetPixels: newMap, pixels: clonePixels(newMap.get(newKey) ?? makeBlankPixels()) });
    } else {
      const key = getTileKey(state.selectedFrameCol, state.selectedFrameRow);
      const newMap = new Map(state.spritesheetPixels);
      newMap.set(key, clonePixels(state.pixels));
      set({ editTarget: target, spritesheetPixels: newMap, pixels: clonePixels(newMap.get(key) ?? makeBlankPixels()) });
    }
    // Load the appropriate canvas
    if (target === 'tileset') {
      const key = getTileKey(state.selectedTileCol, state.selectedTileRow);
      set({ pixels: clonePixels(get().tilesetPixels.get(key) ?? makeBlankPixels()), history: [], historyIndex: -1 });
    } else {
      const key = getTileKey(state.selectedFrameCol, state.selectedFrameRow);
      set({ pixels: clonePixels(get().spritesheetPixels.get(key) ?? makeBlankPixels()), history: [], historyIndex: -1 });
    }
  },

  // -------------------------------------------------------------------------
  selectTile: (col, row) => {
    const state = get();
    // Save current canvas back
    const oldKey = getTileKey(state.selectedTileCol, state.selectedTileRow);
    const newMap = new Map(state.tilesetPixels);
    newMap.set(oldKey, clonePixels(state.pixels));
    // Load new tile
    const newKey = getTileKey(col, row);
    const newPixels = clonePixels(newMap.get(newKey) ?? makeBlankPixels());
    set({
      selectedTileCol: col,
      selectedTileRow: row,
      tilesetPixels: newMap,
      pixels: newPixels,
      history: [],
      historyIndex: -1,
    });
  },

  selectFrame: (col, row) => {
    const state = get();
    const oldKey = getTileKey(state.selectedFrameCol, state.selectedFrameRow);
    const newMap = new Map(state.spritesheetPixels);
    newMap.set(oldKey, clonePixels(state.pixels));
    const newKey = getTileKey(col, row);
    const newPixels = clonePixels(newMap.get(newKey) ?? makeBlankPixels());
    set({
      selectedFrameCol: col,
      selectedFrameRow: row,
      spritesheetPixels: newMap,
      pixels: newPixels,
      history: [],
      historyIndex: -1,
    });
  },

  // -------------------------------------------------------------------------
  setPixel: (x, y, color) => {
    if (x < 0 || x >= 16 || y < 0 || y >= 16) return;
    const state = get();
    const newPixels = clonePixels(state.pixels);
    const idx = (y * 16 + x) * 4;
    newPixels[idx] = color[0];
    newPixels[idx + 1] = color[1];
    newPixels[idx + 2] = color[2];
    newPixels[idx + 3] = color[3];
    set({ pixels: newPixels });
  },

  setPixels: (newPixels) => {
    set({ pixels: clonePixels(newPixels) });
  },

  // -------------------------------------------------------------------------
  pushHistory: () => {
    const state = get();
    const newEntry: HistoryEntry = { pixels: clonePixels(state.pixels) };
    // Truncate forward history
    const truncated = state.history.slice(0, state.historyIndex + 1);
    const newHistory = [...truncated, newEntry].slice(-MAX_HISTORY);
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex <= 0) return;
    const newIndex = state.historyIndex - 1;
    const entry = state.history[newIndex];
    set({ pixels: clonePixels(entry.pixels), historyIndex: newIndex });
  },

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;
    const newIndex = state.historyIndex + 1;
    const entry = state.history[newIndex];
    set({ pixels: clonePixels(entry.pixels), historyIndex: newIndex });
  },

  // -------------------------------------------------------------------------
  setActiveTool: (tool) => set({ activeTool: tool }),
  setMirrorMode: (mode) => set({ mirrorMode: mode }),
  setZoom: (zoom) => set({ zoom }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),

  // -------------------------------------------------------------------------
  setFgColor: (color) => set({ fgColor: color }),
  setBgColor: (color) => set({ bgColor: color }),
  swapColors: () => set((s) => ({ fgColor: s.bgColor, bgColor: s.fgColor })),

  addRecentColor: (color) => {
    const state = get();
    const filtered = state.recentColors.filter((c) => !colorsEqual(c, color));
    const newRecent = [color, ...filtered].slice(0, MAX_RECENT_COLORS);
    set({ recentColors: newRecent });
  },

  // -------------------------------------------------------------------------
  setAnimPreviewFps: (fps) => set({ animPreviewFps: fps }),
  setAnimPreviewPlaying: (playing) => set({ animPreviewPlaying: playing }),

  setShowAIPanel: (show) => set({ showAIPanel: show }),

  applyAIPixels: (pixels) => {
    const state = get();
    // Push current state to history before applying
    const newEntry: HistoryEntry = { pixels: clonePixels(state.pixels) };
    const truncated = state.history.slice(0, state.historyIndex + 1);
    const newHistory = [...truncated, newEntry].slice(-MAX_HISTORY);
    set({ pixels: clonePixels(pixels), history: newHistory, historyIndex: newHistory.length - 1 });
  },
}));
