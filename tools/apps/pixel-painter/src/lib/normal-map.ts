/**
 * Normal map computation from heightmap data.
 *
 * Matches the engine's central-difference algorithm (app.cpp:525-556):
 *   dhdx = h(x+1,y) - h(x-1,y)
 *   dhdy = h(x,y+1) - h(x,y-1)
 *   normal = normalize(-dhdx, -dhdy, 1.0)
 *   encode: (n * 0.5 + 0.5) * 255
 *   Clamp sampling at tile boundaries (no wrap).
 */

/** Single-channel heightmap data (1 byte per pixel, w*h total) */
export type HeightmapData = Uint8ClampedArray;

/**
 * Create a blank heightmap filled with 128 (flat mid-height).
 */
export function makeBlankHeightmap(w: number, h: number): HeightmapData {
  const data = new Uint8ClampedArray(w * h);
  data.fill(128);
  return data;
}

/**
 * Convert a grayscale height value to RGBA for display.
 */
export function heightToColor(height: number): [number, number, number, number] {
  const h = Math.max(0, Math.min(255, Math.round(height)));
  return [h, h, h, 255];
}

/**
 * Encode a normal vector to display RGBA.
 */
export function normalToColor(
  nx: number,
  ny: number,
  nz: number,
): [number, number, number, number] {
  return [
    Math.round(Math.max(0, Math.min(255, (nx * 0.5 + 0.5) * 255))),
    Math.round(Math.max(0, Math.min(255, (ny * 0.5 + 0.5) * 255))),
    Math.round(Math.max(0, Math.min(255, (nz * 0.5 + 0.5) * 255))),
    255,
  ];
}

/**
 * Compute an RGBA normal map from a single-channel heightmap.
 * Output is w*h*4 bytes (RGBA).
 */
export function heightmapToNormalMap(
  heightmap: HeightmapData,
  w: number,
  h: number,
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(w * h * 4);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Clamp sampling at tile boundaries (no wrap)
      const xm = Math.max(0, x - 1);
      const xp = Math.min(w - 1, x + 1);
      const ym = Math.max(0, y - 1);
      const yp = Math.min(h - 1, y + 1);

      const dhdx = heightmap[y * w + xp] - heightmap[y * w + xm];
      const dhdy = heightmap[yp * w + x] - heightmap[ym * w + x];

      // Normal = normalize(-dhdx, -dhdy, 1)
      let nx = -dhdx;
      let ny = -dhdy;
      let nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      // Encode to [0,255]: n * 0.5 + 0.5
      const idx = (y * w + x) * 4;
      output[idx + 0] = Math.round(Math.max(0, Math.min(255, (nx * 0.5 + 0.5) * 255)));
      output[idx + 1] = Math.round(Math.max(0, Math.min(255, (ny * 0.5 + 0.5) * 255)));
      output[idx + 2] = Math.round(Math.max(0, Math.min(255, (nz * 0.5 + 0.5) * 255)));
      output[idx + 3] = 255;
    }
  }

  return output;
}
