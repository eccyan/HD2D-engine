#!/usr/bin/env node
/**
 * Generate a demo shadow-box landscape for Map Painter.
 * Creates a .mapdata file with a pixel art scene and height data.
 *
 * Scene: A small village at sunset with depth layering.
 *   - Sky gradient (back, height=0)
 *   - Distant mountains (height=4)
 *   - Rolling hills (height=12)
 *   - Village buildings (height=30-50)
 *   - Foreground grass/path (height=20)
 *   - Trees (height=40-55)
 */

const W = 128;
const H = 96;
const SIZE = W * H;

// Layer pixel data (RGBA)
const ground = new Uint8Array(SIZE * 4);
const walls = new Uint8Array(SIZE * 4);
const decorations = new Uint8Array(SIZE * 4);
const heights = new Float32Array(SIZE);

// --- Color helpers ---
function setPixel(layer, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const idx = (y * W + x) * 4;
  layer[idx] = r;
  layer[idx + 1] = g;
  layer[idx + 2] = b;
  layer[idx + 3] = a;
}

function setHeight(x, y, h) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  heights[y * W + x] = h;
}

function fillRect(layer, x, y, w, h, r, g, b, a = 255) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(layer, x + dx, y + dy, r, g, b, a);
}

function fillRectHeight(x, y, w, h, val) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setHeight(x + dx, y + dy, val);
}

// --- Sky gradient (ground layer, height=0) ---
for (let y = 0; y < H; y++) {
  const t = y / H;
  // Sunset gradient: deep blue → orange → pink
  let r, g, b;
  if (t < 0.3) {
    // Upper sky: deep blue to purple
    const s = t / 0.3;
    r = Math.round(25 + s * 60);
    g = Math.round(20 + s * 30);
    b = Math.round(80 + s * 40);
  } else if (t < 0.5) {
    // Mid sky: purple to orange
    const s = (t - 0.3) / 0.2;
    r = Math.round(85 + s * 140);
    g = Math.round(50 + s * 60);
    b = Math.round(120 - s * 80);
  } else {
    // Lower sky: warm orange-pink
    const s = (t - 0.5) / 0.5;
    r = Math.round(225 - s * 30);
    g = Math.round(110 - s * 40);
    b = Math.round(40 + s * 20);
  }
  for (let x = 0; x < W; x++) {
    setPixel(ground, x, y, r, g, b);
    setHeight(x, y, 0);
  }
}

// --- Sun (ground layer) ---
const sunCx = 80, sunCy = 35;
for (let dy = -8; dy <= 8; dy++) {
  for (let dx = -8; dx <= 8; dx++) {
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= 7) {
      const t = dist / 7;
      const r = 255;
      const g = Math.round(220 - t * 60);
      const b = Math.round(100 - t * 80);
      setPixel(ground, sunCx + dx, sunCy + dy, r, g, b);
    }
  }
}

// --- Distant mountains (walls layer, height=4-8) ---
function mountain(cx, baseY, peakH, width, r, g, b, h) {
  for (let dx = -width; dx <= width; dx++) {
    const t = Math.abs(dx) / width;
    const my = Math.round(baseY - peakH * (1 - t * t));
    for (let y = my; y <= baseY; y++) {
      const shade = 1.0 - (baseY - y) / (peakH * 1.2);
      setPixel(walls, cx + dx, y,
        Math.round(r * shade), Math.round(g * shade), Math.round(b * shade));
      setHeight(cx + dx, y, h * (1 - t * 0.5));
    }
  }
}

mountain(20, 55, 18, 22, 90, 80, 120, 6);
mountain(55, 55, 24, 28, 80, 70, 110, 8);
mountain(95, 55, 15, 20, 100, 85, 115, 5);
mountain(115, 55, 20, 18, 85, 75, 108, 7);

// --- Rolling hills / ground (ground layer, height=15-20) ---
for (let x = 0; x < W; x++) {
  const hillH = 55 + Math.round(4 * Math.sin(x * 0.08) + 2 * Math.sin(x * 0.15 + 1));
  for (let y = hillH; y < H; y++) {
    const depth = y - hillH;
    const grassR = Math.round(45 + depth * 1.5 + Math.random() * 8);
    const grassG = Math.round(90 + depth * 0.5 + Math.random() * 10);
    const grassB = Math.round(30 + depth * 0.5);
    setPixel(ground, x, y, grassR, grassG, grassB);
    setHeight(x, y, 18 + Math.round(3 * Math.sin(x * 0.1)));
  }
}

// --- Path (ground layer, lower height) ---
for (let y = 65; y < H; y++) {
  const pathCenter = 64 + Math.round(6 * Math.sin(y * 0.12));
  const pathWidth = 5 + Math.round(2 * (y - 65) / (H - 65));
  for (let dx = -pathWidth; dx <= pathWidth; dx++) {
    const x = pathCenter + dx;
    const edgeFade = Math.abs(dx) / pathWidth;
    const r = Math.round(160 - edgeFade * 40 + Math.random() * 5);
    const g = Math.round(130 - edgeFade * 30 + Math.random() * 5);
    const b = Math.round(90 - edgeFade * 20);
    setPixel(ground, x, y, r, g, b);
    setHeight(x, y, 15);
  }
}

// --- Houses (decorations layer) ---
function house(x, y, w, h, wallR, wallG, wallB, roofR, roofG, roofB, depth) {
  // Wall
  fillRect(decorations, x, y, w, h, wallR, wallG, wallB);
  fillRectHeight(x, y, w, h, depth);

  // Roof (triangle-ish)
  const roofH = Math.round(h * 0.5);
  for (let dy = 0; dy < roofH; dy++) {
    const indent = Math.round(dy * 0.3);
    for (let dx = indent; dx < w - indent; dx++) {
      setPixel(decorations, x + dx, y - roofH + dy, roofR, roofG, roofB);
      setHeight(x + dx, y - roofH + dy, depth + 5);
    }
  }

  // Door
  const doorW = Math.max(2, Math.round(w * 0.25));
  const doorH = Math.round(h * 0.5);
  const doorX = x + Math.round((w - doorW) / 2);
  fillRect(decorations, doorX, y + h - doorH, doorW, doorH, 60, 40, 25);

  // Window
  if (w >= 8) {
    setPixel(decorations, x + 2, y + 2, 200, 220, 255);
    setPixel(decorations, x + 3, y + 2, 200, 220, 255);
    setPixel(decorations, x + 2, y + 3, 200, 220, 255);
    setPixel(decorations, x + 3, y + 3, 200, 220, 255);

    setPixel(decorations, x + w - 4, y + 2, 200, 220, 255);
    setPixel(decorations, x + w - 3, y + 2, 200, 220, 255);
    setPixel(decorations, x + w - 4, y + 3, 200, 220, 255);
    setPixel(decorations, x + w - 3, y + 3, 200, 220, 255);
  }
}

house(25, 62, 10, 8, 180, 160, 130, 150, 60, 50, 35);
house(42, 60, 12, 10, 170, 150, 120, 80, 100, 140, 40);
house(78, 63, 9, 7, 190, 170, 140, 140, 70, 55, 32);
house(95, 58, 14, 12, 160, 145, 115, 90, 110, 150, 45);

// --- Trees (decorations layer) ---
function tree(cx, baseY, trunkH, canopyR, depth) {
  // Trunk
  for (let dy = 0; dy < trunkH; dy++) {
    setPixel(decorations, cx, baseY - dy, 90, 60, 35);
    setPixel(decorations, cx + 1, baseY - dy, 80, 55, 30);
    setHeight(cx, baseY - dy, depth);
    setHeight(cx + 1, baseY - dy, depth);
  }
  // Canopy (circle-ish)
  const r = canopyR;
  const cy = baseY - trunkH - r + 1;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r + 1) {
        const shade = 0.7 + 0.3 * (1 - (dy + r) / (2 * r));
        const gr = Math.round((30 + Math.random() * 20) * shade);
        const gg = Math.round((80 + Math.random() * 40) * shade);
        const gb = Math.round((20 + Math.random() * 15) * shade);
        setPixel(decorations, cx + dx, cy + dy, gr, gg, gb);
        setHeight(cx + dx, cy + dy, depth + 8);
      }
    }
  }
}

tree(15, 70, 6, 4, 45);
tree(60, 68, 7, 5, 50);
tree(72, 72, 5, 3, 42);
tree(110, 69, 8, 5, 55);
tree(5, 75, 5, 3, 38);
tree(120, 73, 6, 4, 40);

// --- Fence posts along path (decorations layer) ---
for (let y = 68; y < H; y += 4) {
  const pathCenter = 64 + Math.round(6 * Math.sin(y * 0.12));
  const pathWidth = 5 + Math.round(2 * (y - 65) / (H - 65));
  // Left fence
  setPixel(decorations, pathCenter - pathWidth - 2, y, 140, 110, 70);
  setPixel(decorations, pathCenter - pathWidth - 2, y - 1, 140, 110, 70);
  setPixel(decorations, pathCenter - pathWidth - 2, y - 2, 130, 100, 60);
  setHeight(pathCenter - pathWidth - 2, y, 25);
  setHeight(pathCenter - pathWidth - 2, y - 1, 25);
  setHeight(pathCenter - pathWidth - 2, y - 2, 25);
  // Right fence
  setPixel(decorations, pathCenter + pathWidth + 2, y, 140, 110, 70);
  setPixel(decorations, pathCenter + pathWidth + 2, y - 1, 140, 110, 70);
  setPixel(decorations, pathCenter + pathWidth + 2, y - 2, 130, 100, 60);
  setHeight(pathCenter + pathWidth + 2, y, 25);
  setHeight(pathCenter + pathWidth + 2, y - 1, 25);
  setHeight(pathCenter + pathWidth + 2, y - 2, 25);
}

// --- Fence rails ---
for (let y = 68; y < H; y++) {
  const pathCenter = 64 + Math.round(6 * Math.sin(y * 0.12));
  const pathWidth = 5 + Math.round(2 * (y - 65) / (H - 65));
  if (y % 4 !== 0) {
    setPixel(decorations, pathCenter - pathWidth - 2, y - 1, 120, 95, 55);
    setHeight(pathCenter - pathWidth - 2, y - 1, 24);
    setPixel(decorations, pathCenter + pathWidth + 2, y - 1, 120, 95, 55);
    setHeight(pathCenter + pathWidth + 2, y - 1, 24);
  }
}

// --- Stars in upper sky (ground layer) ---
const starPositions = [
  [10, 5], [30, 8], [50, 3], [70, 10], [90, 6], [105, 4],
  [15, 15], [45, 12], [65, 18], [85, 14], [110, 16],
  [8, 22], [35, 20], [55, 25], [100, 22], [120, 12],
];
for (const [sx, sy] of starPositions) {
  const bright = 180 + Math.round(Math.random() * 75);
  setPixel(ground, sx, sy, bright, bright, Math.round(bright * 0.9));
}

// === Encode to .mapdata format ===
function encodeBase64(arr) {
  const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return Buffer.from(bin, 'binary').toString('base64');
}

const mapdata = JSON.stringify({
  version: 1,
  width: W,
  height: H,
  layers: {
    ground: encodeBase64(ground),
    walls: encodeBase64(walls),
    decorations: encodeBase64(decorations),
  },
  heights: encodeBase64(heights),
  collisionGrid: new Array(SIZE).fill(false),
  previewCamera: {
    position: [0, 0, 200],
    target: [0, 0, 0],
    fov: 45,
  },
});

const fs = await import('fs');
const outPath = 'demo-village.mapdata';
fs.writeFileSync(outPath, mapdata);
console.log(`Written ${outPath} (${W}x${H}, ${(mapdata.length / 1024).toFixed(0)} KB)`);
