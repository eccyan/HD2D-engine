import { create } from 'zustand';

export type Tool = 'pencil' | 'fill' | 'eraser' | 'rectangle' | 'line' | 'height' | 'select';
export type Layer = 'ground' | 'walls' | 'decorations';

export interface MapPainterState {
  // Map dimensions
  width: number;
  height: number;

  // Pixel data: RGBA per cell per layer
  layers: Record<Layer, Uint8Array>;
  heights: Float32Array;

  // Active tool state
  activeTool: Tool;
  activeLayer: Layer;
  activeColor: [number, number, number, number];
  heightBrushValue: number;
  brushSize: number;

  // Zoom/pan
  zoom: number;
  panX: number;
  panY: number;

  // Selection
  selectionStart: [number, number] | null;
  selectionEnd: [number, number] | null;

  // Collision grid
  collisionGrid: boolean[];
  showCollision: boolean;
  showHeight: boolean;

  // 3D preview camera
  previewCamera: {
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
  };

  // Undo history
  undoStack: { layers: Record<Layer, Uint8Array>; heights: Float32Array }[];
  redoStack: { layers: Record<Layer, Uint8Array>; heights: Float32Array }[];

  // Actions
  initMap: (width: number, height: number) => void;
  resizeMap: (width: number, height: number) => void;
  setTool: (tool: Tool) => void;
  setActiveLayer: (layer: Layer) => void;
  setColor: (color: [number, number, number, number]) => void;
  setHeightBrushValue: (value: number) => void;
  setBrushSize: (size: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setShowCollision: (show: boolean) => void;
  setShowHeight: (show: boolean) => void;

  // Pixel operations
  setPixel: (x: number, y: number, r: number, g: number, b: number, a: number) => void;
  erasePixel: (x: number, y: number) => void;
  fillArea: (x: number, y: number, r: number, g: number, b: number, a: number) => void;
  setHeight: (x: number, y: number, height: number) => void;

  // Collision
  toggleCollision: (x: number, y: number) => void;
  autoGenerateCollision: (heightThreshold: number) => void;

  // Undo/redo
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;

  // Import
  importImageToLayer: (imageData: ImageData) => void;

  // Save/Load
  saveProject: () => string;
  loadProject: (json: string) => void;

  // Export
  setPreviewCamera: (camera: MapPainterState['previewCamera']) => void;
}

function createEmptyLayers(size: number): Record<Layer, Uint8Array> {
  return {
    ground: new Uint8Array(size * 4),
    walls: new Uint8Array(size * 4),
    decorations: new Uint8Array(size * 4),
  };
}

function cloneLayers(layers: Record<Layer, Uint8Array>): Record<Layer, Uint8Array> {
  return {
    ground: new Uint8Array(layers.ground),
    walls: new Uint8Array(layers.walls),
    decorations: new Uint8Array(layers.decorations),
  };
}

function getPixelIndex(x: number, y: number, width: number): number {
  return (y * width + x) * 4;
}

function colorsMatch(data: Uint8Array, idx: number, r: number, g: number, b: number, a: number): boolean {
  return data[idx] === r && data[idx + 1] === g && data[idx + 2] === b && data[idx + 3] === a;
}

export const useMapStore = create<MapPainterState>((set, get) => ({
  width: 256,
  height: 224,
  layers: createEmptyLayers(256 * 224),
  heights: new Float32Array(256 * 224),
  activeTool: 'pencil',
  activeLayer: 'ground',
  activeColor: [76, 153, 76, 255],
  heightBrushValue: 1,
  brushSize: 1,
  zoom: 4,
  panX: 0,
  panY: 0,
  selectionStart: null,
  selectionEnd: null,
  collisionGrid: new Array(256 * 224).fill(false),
  showCollision: false,
  showHeight: true,
  previewCamera: {
    position: [0, 0, 200],  // looking straight at XY map from +Z
    target: [0, 0, 0],
    fov: 45,
  },
  undoStack: [],
  redoStack: [],

  initMap: (width, height) => {
    const size = width * height;
    set({
      width, height,
      layers: createEmptyLayers(size),
      heights: new Float32Array(size),
      collisionGrid: new Array(size).fill(false),
      undoStack: [],
      redoStack: [],
    });
  },

  resizeMap: (width, height) => {
    const state = get();
    const size = width * height;
    const newLayers = createEmptyLayers(size);
    const newHeights = new Float32Array(size);
    const newCollision = new Array(size).fill(false);

    // Copy existing data
    const copyW = Math.min(state.width, width);
    const copyH = Math.min(state.height, height);
    for (let y = 0; y < copyH; y++) {
      for (let x = 0; x < copyW; x++) {
        const oldIdx = getPixelIndex(x, y, state.width);
        const newIdx = getPixelIndex(x, y, width);
        for (const layer of ['ground', 'walls', 'decorations'] as Layer[]) {
          for (let c = 0; c < 4; c++) {
            newLayers[layer][newIdx + c] = state.layers[layer][oldIdx + c];
          }
        }
        const oldFlatIdx = y * state.width + x;
        const newFlatIdx = y * width + x;
        newHeights[newFlatIdx] = state.heights[oldFlatIdx];
        newCollision[newFlatIdx] = state.collisionGrid[oldFlatIdx];
      }
    }

    set({
      width, height,
      layers: newLayers,
      heights: newHeights,
      collisionGrid: newCollision,
    });
  },

  setTool: (tool) => set({ activeTool: tool }),
  setActiveLayer: (layer) => set({ activeLayer: layer }),
  setColor: (color) => set({ activeColor: color }),
  setHeightBrushValue: (value) => set({ heightBrushValue: value }),
  setBrushSize: (size) => set({ brushSize: Math.max(1, Math.min(32, size)) }),
  setZoom: (zoom) => set({ zoom: Math.max(1, Math.min(64, zoom)) }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  setShowCollision: (show) => set({ showCollision: show }),
  setShowHeight: (show) => set({ showHeight: show }),

  setPixel: (x, y, r, g, b, a) => {
    const state = get();
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) return;
    const idx = getPixelIndex(x, y, state.width);
    const layerData = state.layers[state.activeLayer];
    layerData[idx] = r;
    layerData[idx + 1] = g;
    layerData[idx + 2] = b;
    layerData[idx + 3] = a;
    set({ layers: { ...state.layers } });
  },

  erasePixel: (x, y) => {
    const state = get();
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) return;
    const idx = getPixelIndex(x, y, state.width);
    const layerData = state.layers[state.activeLayer];
    layerData[idx] = 0;
    layerData[idx + 1] = 0;
    layerData[idx + 2] = 0;
    layerData[idx + 3] = 0;
    set({ layers: { ...state.layers } });
  },

  fillArea: (startX, startY, r, g, b, a) => {
    const state = get();
    if (startX < 0 || startX >= state.width || startY < 0 || startY >= state.height) return;

    const layerData = state.layers[state.activeLayer];
    const startIdx = getPixelIndex(startX, startY, state.width);
    const targetR = layerData[startIdx];
    const targetG = layerData[startIdx + 1];
    const targetB = layerData[startIdx + 2];
    const targetA = layerData[startIdx + 3];

    if (targetR === r && targetG === g && targetB === b && targetA === a) return;

    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<number>();

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      const flatIdx = cy * state.width + cx;
      if (visited.has(flatIdx)) continue;
      if (cx < 0 || cx >= state.width || cy < 0 || cy >= state.height) continue;

      const idx = getPixelIndex(cx, cy, state.width);
      if (!colorsMatch(layerData, idx, targetR, targetG, targetB, targetA)) continue;

      visited.add(flatIdx);
      layerData[idx] = r;
      layerData[idx + 1] = g;
      layerData[idx + 2] = b;
      layerData[idx + 3] = a;

      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }

    set({ layers: { ...state.layers } });
  },

  setHeight: (x, y, height) => {
    const state = get();
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) return;
    const idx = y * state.width + x;
    state.heights[idx] = height;
    set({ heights: new Float32Array(state.heights) });
  },

  toggleCollision: (x, y) => {
    const state = get();
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) return;
    const idx = y * state.width + x;
    const newGrid = [...state.collisionGrid];
    newGrid[idx] = !newGrid[idx];
    set({ collisionGrid: newGrid });
  },

  autoGenerateCollision: (heightThreshold) => {
    const state = get();
    const newGrid = new Array(state.width * state.height).fill(false);
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const idx = y * state.width + x;
        if (state.heights[idx] > heightThreshold) {
          newGrid[idx] = true;
        }
      }
    }
    set({ collisionGrid: newGrid });
  },

  pushUndo: () => {
    const state = get();
    set({
      undoStack: [...state.undoStack, {
        layers: cloneLayers(state.layers),
        heights: new Float32Array(state.heights),
      }].slice(-50), // Keep last 50 states
      redoStack: [],
    });
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return;
    const prev = state.undoStack[state.undoStack.length - 1];
    set({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, {
        layers: cloneLayers(state.layers),
        heights: new Float32Array(state.heights),
      }],
      layers: prev.layers,
      heights: prev.heights,
    });
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;
    const next = state.redoStack[state.redoStack.length - 1];
    set({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, {
        layers: cloneLayers(state.layers),
        heights: new Float32Array(state.heights),
      }],
      layers: next.layers,
      heights: next.heights,
    });
  },

  importImageToLayer: (imageData: ImageData) => {
    const state = get();
    const iw = imageData.width;
    const ih = imageData.height;
    const src = imageData.data;

    // Resize map to image dimensions if different
    const needsResize = iw !== state.width || ih !== state.height;
    const w = iw;
    const h = ih;
    const size = w * h;

    let layers: Record<Layer, Uint8Array>;
    let heights: Float32Array;
    let collisionGrid: boolean[];

    if (needsResize) {
      layers = createEmptyLayers(size);
      heights = new Float32Array(size);
      collisionGrid = new Array(size).fill(false);
    } else {
      layers = { ...state.layers };
      heights = state.heights;
      collisionGrid = state.collisionGrid;
    }

    // Write image pixels to the active layer
    const layer = new Uint8Array(layers[state.activeLayer]);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const srcIdx = (y * iw + x) * 4;
        const dstIdx = (y * w + x) * 4;
        layer[dstIdx] = src[srcIdx];
        layer[dstIdx + 1] = src[srcIdx + 1];
        layer[dstIdx + 2] = src[srcIdx + 2];
        layer[dstIdx + 3] = src[srcIdx + 3];
      }
    }
    layers[state.activeLayer] = layer;

    set({
      width: w,
      height: h,
      layers,
      heights,
      collisionGrid,
      undoStack: [],
      redoStack: [],
    });
  },

  saveProject: () => {
    const state = get();
    const encode = (arr: Uint8Array | Float32Array) =>
      btoa(String.fromCharCode(...new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)));
    return JSON.stringify({
      version: 1,
      width: state.width,
      height: state.height,
      layers: {
        ground: encode(state.layers.ground),
        walls: encode(state.layers.walls),
        decorations: encode(state.layers.decorations),
      },
      heights: encode(state.heights),
      collisionGrid: state.collisionGrid,
      previewCamera: state.previewCamera,
    });
  },

  loadProject: (json: string) => {
    const data = JSON.parse(json);
    if (!data.version || !data.width || !data.height) {
      throw new Error('Invalid project file');
    }
    const decode = (b64: string) => {
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    };
    const size = data.width * data.height;
    const layers: Record<Layer, Uint8Array> = {
      ground: new Uint8Array(decode(data.layers.ground).buffer),
      walls: new Uint8Array(decode(data.layers.walls).buffer),
      decorations: new Uint8Array(decode(data.layers.decorations).buffer),
    };
    const heightsRaw = decode(data.heights);
    const heights = new Float32Array(heightsRaw.buffer);
    const collisionGrid: boolean[] = data.collisionGrid || new Array(size).fill(false);
    const previewCamera = data.previewCamera || { position: [0, 0, 200] as [number, number, number], target: [0, 0, 0] as [number, number, number], fov: 45 };

    set({
      width: data.width,
      height: data.height,
      layers,
      heights,
      collisionGrid,
      previewCamera,
      undoStack: [],
      redoStack: [],
    });
  },

  setPreviewCamera: (camera) => set({ previewCamera: camera }),
}));
