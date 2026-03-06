import React, { useRef, useEffect, useCallback, useState } from 'react';
import { usePainterStore, RGBA, PixelData, HeightmapData, pixelDims } from '../store/usePainterStore.js';
import { heightmapToNormalMap } from '../lib/normal-map.js';

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function getPixelAt(pixels: PixelData, x: number, y: number, w: number): RGBA {
  const idx = (y * w + x) * 4;
  return [pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]];
}

function setPixelAt(pixels: PixelData, x: number, y: number, w: number, color: RGBA): void {
  const idx = (y * w + x) * 4;
  pixels[idx] = color[0];
  pixels[idx + 1] = color[1];
  pixels[idx + 2] = color[2];
  pixels[idx + 3] = color[3];
}

function colorsEqual(a: RGBA, b: RGBA): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

function floodFill(pixels: PixelData, startX: number, startY: number, fillColor: RGBA, w: number, h: number): PixelData {
  const result = new Uint8ClampedArray(pixels) as PixelData;
  const targetColor = getPixelAt(result, startX, startY, w);
  if (colorsEqual(targetColor, fillColor)) return result;

  const stack: [number, number][] = [[startX, startY]];
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    const current = getPixelAt(result, x, y, w);
    if (!colorsEqual(current, targetColor)) continue;
    setPixelAt(result, x, y, w, fillColor);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return result;
}

function drawLine(pixels: PixelData, x0: number, y0: number, x1: number, y1: number, color: RGBA, w: number, h: number): PixelData {
  const result = new Uint8ClampedArray(pixels) as PixelData;
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0;
  let cy = y0;
  while (true) {
    if (cx >= 0 && cx < w && cy >= 0 && cy < h) {
      setPixelAt(result, cx, cy, w, color);
    }
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }
  return result;
}

function drawRect(pixels: PixelData, x0: number, y0: number, x1: number, y1: number, color: RGBA, w: number, h: number): PixelData {
  const result = new Uint8ClampedArray(pixels) as PixelData;
  const minX = Math.max(0, Math.min(x0, x1));
  const maxX = Math.min(w - 1, Math.max(x0, x1));
  const minY = Math.max(0, Math.min(y0, y1));
  const maxY = Math.min(h - 1, Math.max(y0, y1));
  for (let x = minX; x <= maxX; x++) {
    setPixelAt(result, x, minY, w, color);
    setPixelAt(result, x, maxY, w, color);
  }
  for (let y = minY; y <= maxY; y++) {
    setPixelAt(result, minX, y, w, color);
    setPixelAt(result, maxX, y, w, color);
  }
  return result;
}

function getMirroredPositions(x: number, y: number, mode: string, w: number, h: number): [number, number][] {
  const positions: [number, number][] = [[x, y]];
  if (mode === 'horizontal' || mode === 'both') {
    positions.push([w - 1 - x, y]);
  }
  if (mode === 'vertical' || mode === 'both') {
    positions.push([x, h - 1 - y]);
  }
  if (mode === 'both') {
    positions.push([w - 1 - x, h - 1 - y]);
  }
  return positions;
}

// ---------------------------------------------------------------------------
// Render canvas to screen
// ---------------------------------------------------------------------------

function renderToCanvas(
  ctx: CanvasRenderingContext2D,
  pixels: PixelData,
  zoom: number,
  showGrid: boolean,
  hoverX: number,
  hoverY: number,
  canvasW: number,
  canvasH: number,
  pixW: number,
  pixH: number,
  heightmapMode?: boolean,
  heightmapPixels?: HeightmapData,
  heightmapOpacity?: number,
): void {
  ctx.clearRect(0, 0, canvasW, canvasH);

  // Checkerboard background for transparency
  const checkSize = Math.max(2, Math.floor(zoom / 4));
  for (let y = 0; y < canvasH; y += checkSize) {
    for (let x = 0; x < canvasW; x += checkSize) {
      const light = ((Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0);
      ctx.fillStyle = light ? '#555' : '#444';
      ctx.fillRect(x, y, checkSize, checkSize);
    }
  }

  if (heightmapMode && heightmapPixels) {
    // In heightmap mode, draw diffuse at reduced opacity first
    const diffuseAlpha = 1 - (heightmapOpacity ?? 0.5);
    if (diffuseAlpha > 0.01) {
      ctx.globalAlpha = diffuseAlpha;
      for (let py = 0; py < pixH; py++) {
        for (let px = 0; px < pixW; px++) {
          const idx = (py * pixW + px) * 4;
          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];
          const a = pixels[idx + 3];
          if (a === 0) continue;
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(px * zoom, py * zoom, zoom, zoom);
        }
      }
    }

    // Draw heightmap as grayscale overlay
    ctx.globalAlpha = heightmapOpacity ?? 0.5;
    for (let py = 0; py < pixH; py++) {
      for (let px = 0; px < pixW; px++) {
        const h = heightmapPixels[py * pixW + px];
        ctx.fillStyle = `rgb(${h},${h},${h})`;
        ctx.fillRect(px * zoom, py * zoom, zoom, zoom);
      }
    }
    ctx.globalAlpha = 1;
  } else {
    // Normal diffuse rendering
    for (let py = 0; py < pixH; py++) {
      for (let px = 0; px < pixW; px++) {
        const idx = (py * pixW + px) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const a = pixels[idx + 3];
        if (a === 0) continue;
        ctx.globalAlpha = a / 255;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(px * zoom, py * zoom, zoom, zoom);
      }
    }
    ctx.globalAlpha = 1;
  }

  // Grid overlay
  if (showGrid && zoom >= 4) {
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= pixW; i++) {
      ctx.beginPath();
      ctx.moveTo(i * zoom, 0);
      ctx.lineTo(i * zoom, pixH * zoom);
      ctx.stroke();
    }
    for (let i = 0; i <= pixH; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * zoom);
      ctx.lineTo(pixW * zoom, i * zoom);
      ctx.stroke();
    }
  }

  // Hover highlight
  if (hoverX >= 0 && hoverY >= 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hoverX * zoom + 0.5, hoverY * zoom + 0.5, zoom - 1, zoom - 1);
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  width?: number;
  height?: number;
}

export function PixelCanvas({ width = 384, height = 384 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    pixels,
    activeTool,
    mirrorMode,
    zoom,
    showGrid,
    fgColor,
    bgColor,
    manifest,
    editTarget,
    activeLayer,
    heightValue,
    heightmapPixels,
    heightmapOpacity,
    setPixels,
    setFgColor,
    pushHistory,
    setActiveTool,
    addRecentColor,
    setHeightmapPixels,
    setHeightValue,
  } = usePainterStore();

  const { w: pixW, h: pixH } = pixelDims({ editTarget, manifest });

  const [hoverPos, setHoverPos] = useState<[number, number]>([-1, -1]);
  const [isDrawing, setIsDrawing] = useState(false);

  const drawStartRef = useRef<[number, number] | null>(null);
  const drawBasePixelsRef = useRef<PixelData | null>(null);

  const getCell = useCallback((e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / zoom);
    const y = Math.floor((e.clientY - rect.top) / zoom);
    return [
      Math.max(0, Math.min(pixW - 1, x)),
      Math.max(0, Math.min(pixH - 1, y)),
    ];
  }, [zoom, pixW, pixH]);

  const paintPixel = useCallback((px: PixelData, x: number, y: number, color: RGBA): PixelData => {
    const result = new Uint8ClampedArray(px) as PixelData;
    const positions = getMirroredPositions(x, y, mirrorMode, pixW, pixH);
    for (const [mx, my] of positions) {
      setPixelAt(result, mx, my, pixW, color);
    }
    return result;
  }, [mirrorMode, pixW, pixH]);

  const isHeightmapMode = activeLayer === 'heightmap';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    renderToCanvas(ctx, pixels, zoom, showGrid, hoverPos[0], hoverPos[1], width, height, pixW, pixH, isHeightmapMode, heightmapPixels, heightmapOpacity);
  }, [pixels, zoom, showGrid, hoverPos, width, height, pixW, pixH, isHeightmapMode, heightmapPixels, heightmapOpacity]);

  // Heightmap paint helper
  const paintHeightmapPixel = useCallback((hm: HeightmapData, x: number, y: number, h: number): HeightmapData => {
    const result = new Uint8ClampedArray(hm) as HeightmapData;
    const positions = getMirroredPositions(x, y, mirrorMode, pixW, pixH);
    for (const [mx, my] of positions) {
      result[my * pixW + mx] = h;
    }
    return result;
  }, [mirrorMode, pixW, pixH]);

  // Heightmap flood fill
  const heightmapFloodFill = useCallback((hm: HeightmapData, startX: number, startY: number, fillH: number, w: number, h: number): HeightmapData => {
    const result = new Uint8ClampedArray(hm) as HeightmapData;
    const targetH = result[startY * w + startX];
    if (targetH === fillH) return result;
    const stack: [number, number][] = [[startX, startY]];
    while (stack.length > 0) {
      const [sx, sy] = stack.pop()!;
      if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
      if (result[sy * w + sx] !== targetH) continue;
      result[sy * w + sx] = fillH;
      stack.push([sx + 1, sy], [sx - 1, sy], [sx, sy + 1], [sx, sy - 1]);
    }
    return result;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const [x, y] = getCell(e);
    const isRight = e.button === 2;
    const color = isRight ? bgColor : fgColor;
    const eraserColor: RGBA = [0, 0, 0, 0];

    // Heightmap mode
    if (isHeightmapMode) {
      if (activeTool === 'eyedropper') {
        const picked = heightmapPixels[y * pixW + x];
        setHeightValue(picked);
        setActiveTool('pencil');
        return;
      }

      pushHistory();
      setIsDrawing(true);

      const brushH = activeTool === 'eraser' ? 128 : heightValue;

      if (activeTool === 'fill') {
        const filled = heightmapFloodFill(heightmapPixels, x, y, brushH, pixW, pixH);
        setHeightmapPixels(filled);
        setIsDrawing(false);
        return;
      }

      if (activeTool === 'line' || activeTool === 'rect') {
        drawStartRef.current = [x, y];
        drawBasePixelsRef.current = new Uint8ClampedArray(heightmapPixels) as unknown as PixelData;
        return;
      }

      const newHm = paintHeightmapPixel(heightmapPixels, x, y, brushH);
      setHeightmapPixels(newHm);
      return;
    }

    // Diffuse mode
    if (activeTool === 'eyedropper') {
      const picked = getPixelAt(pixels, x, y, pixW);
      if (isRight) {
        usePainterStore.getState().setBgColor(picked);
      } else {
        setFgColor(picked);
        addRecentColor(picked);
      }
      setActiveTool('pencil');
      return;
    }

    pushHistory();
    setIsDrawing(true);

    if (activeTool === 'fill') {
      const filled = floodFill(pixels, x, y, activeTool === 'fill' && isRight ? bgColor : color, pixW, pixH);
      setPixels(filled);
      addRecentColor(color);
      setIsDrawing(false);
      return;
    }

    if (activeTool === 'line' || activeTool === 'rect') {
      drawStartRef.current = [x, y];
      drawBasePixelsRef.current = new Uint8ClampedArray(pixels) as PixelData;
      return;
    }

    const drawColor = activeTool === 'eraser' ? eraserColor : color;
    const newPixels = paintPixel(pixels, x, y, drawColor);
    setPixels(newPixels);
    if (activeTool !== 'eraser') addRecentColor(color);
  }, [activeTool, fgColor, bgColor, pixels, pixW, pixH, getCell, paintPixel, pushHistory, setPixels, setFgColor, addRecentColor, setActiveTool, isHeightmapMode, heightValue, heightmapPixels, setHeightmapPixels, setHeightValue, paintHeightmapPixel, heightmapFloodFill]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const [x, y] = getCell(e);
    setHoverPos([x, y]);

    if (!isDrawing) return;

    // Heightmap mode
    if (isHeightmapMode) {
      const brushH = activeTool === 'eraser' ? 128 : heightValue;

      if ((activeTool === 'line' || activeTool === 'rect') && drawStartRef.current && drawBasePixelsRef.current) {
        // For line/rect in heightmap mode, use grayscale color rendering on the base
        const baseHm = drawBasePixelsRef.current as unknown as HeightmapData;
        const hmColor: RGBA = [brushH, brushH, brushH, 255];
        // Convert heightmap to fake RGBA for line/rect drawing, then extract back
        const fakeRGBA = new Uint8ClampedArray(pixW * pixH * 4) as PixelData;
        for (let i = 0; i < pixW * pixH; i++) {
          fakeRGBA[i * 4] = baseHm[i];
          fakeRGBA[i * 4 + 1] = baseHm[i];
          fakeRGBA[i * 4 + 2] = baseHm[i];
          fakeRGBA[i * 4 + 3] = 255;
        }
        const drawn = activeTool === 'line'
          ? drawLine(fakeRGBA, drawStartRef.current[0], drawStartRef.current[1], x, y, hmColor, pixW, pixH)
          : drawRect(fakeRGBA, drawStartRef.current[0], drawStartRef.current[1], x, y, hmColor, pixW, pixH);
        const newHm = new Uint8ClampedArray(pixW * pixH) as HeightmapData;
        for (let i = 0; i < pixW * pixH; i++) {
          newHm[i] = drawn[i * 4];
        }
        setHeightmapPixels(newHm);
        return;
      }

      if (activeTool === 'pencil' || activeTool === 'eraser') {
        const newHm = paintHeightmapPixel(heightmapPixels, x, y, brushH);
        setHeightmapPixels(newHm);
      }
      return;
    }

    // Diffuse mode
    const isRight = e.buttons === 2;
    const color = isRight ? bgColor : fgColor;
    const eraserColor: RGBA = [0, 0, 0, 0];

    if (activeTool === 'line' && drawStartRef.current && drawBasePixelsRef.current) {
      const preview = drawLine(
        drawBasePixelsRef.current,
        drawStartRef.current[0], drawStartRef.current[1],
        x, y, color, pixW, pixH
      );
      setPixels(preview);
      return;
    }

    if (activeTool === 'rect' && drawStartRef.current && drawBasePixelsRef.current) {
      const preview = drawRect(
        drawBasePixelsRef.current,
        drawStartRef.current[0], drawStartRef.current[1],
        x, y, color, pixW, pixH
      );
      setPixels(preview);
      return;
    }

    if (activeTool === 'pencil' || activeTool === 'eraser') {
      const drawColor = activeTool === 'eraser' ? eraserColor : color;
      const newPixels = paintPixel(pixels, x, y, drawColor);
      setPixels(newPixels);
    }
  }, [isDrawing, activeTool, fgColor, bgColor, pixels, pixW, pixH, getCell, paintPixel, setPixels, isHeightmapMode, heightValue, heightmapPixels, setHeightmapPixels, paintHeightmapPixel]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    if ((activeTool === 'line' || activeTool === 'rect') && drawStartRef.current) {
      const [x, y] = getCell(e);
      const isRight = e.button === 2;
      const color = isRight ? bgColor : fgColor;
      addRecentColor(color);
    }
    drawStartRef.current = null;
    drawBasePixelsRef.current = null;
  }, [activeTool, fgColor, bgColor, getCell, addRecentColor]);

  const handleMouseLeave = useCallback(() => {
    setHoverPos([-1, -1]);
  }, []);

  const handleExport = useCallback(() => {
    const offscreen = document.createElement('canvas');
    offscreen.width = pixW;
    offscreen.height = pixH;
    const ctx = offscreen.getContext('2d')!;

    if (isHeightmapMode) {
      // Export computed normal map
      const normalMap = heightmapToNormalMap(heightmapPixels, pixW, pixH);
      const imageData = new ImageData(new Uint8ClampedArray(normalMap), pixW, pixH);
      ctx.putImageData(imageData, 0, 0);
      offscreen.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'normal_map.png';
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } else {
      const imageData = new ImageData(new Uint8ClampedArray(pixels), pixW, pixH);
      ctx.putImageData(imageData, 0, 0);
      offscreen.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pixel_art.png';
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    }
  }, [pixels, pixW, pixH, isHeightmapMode, heightmapPixels]);

  const canvasPixelW = pixW * zoom;
  const canvasPixelH = pixH * zoom;

  return (
    <div style={styles.wrapper}>
      {/* Toolbar above canvas */}
      <div style={styles.canvasToolbar}>
        <button onClick={handleExport} style={styles.exportBtn} title={`Export as PNG (${pixW}x${pixH})`}>
          {isHeightmapMode ? 'Export Normal Map' : 'Export PNG'}
        </button>
        <span style={styles.canvasInfo}>
          {hoverPos[0] >= 0 ? `${hoverPos[0]}, ${hoverPos[1]}` : '--'}
        </span>
        <span style={styles.canvasInfo}>
          {hoverPos[0] >= 0
            ? isHeightmapMode
              ? `height: ${heightmapPixels[hoverPos[1] * pixW + hoverPos[0]]}`
              : (() => {
                  const [r, g, b, a] = getPixelAt(pixels, hoverPos[0], hoverPos[1], pixW);
                  return `rgba(${r},${g},${b},${(a / 255).toFixed(2)})`;
                })()
            : ''}
        </span>
      </div>

      {/* Canvas container */}
      <div style={{ ...styles.canvasContainer, width: canvasPixelW, height: canvasPixelH }}>
        <canvas
          ref={canvasRef}
          width={canvasPixelW}
          height={canvasPixelH}
          style={styles.canvas}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  canvasToolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#888',
  },
  exportBtn: {
    background: '#2a3a5a',
    border: '1px solid #4a6ab8',
    borderRadius: 4,
    color: '#90b8f8',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '4px 10px',
    cursor: 'pointer',
  },
  canvasInfo: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#888',
    minWidth: 100,
  },
  canvasContainer: {
    border: '2px solid #444',
    borderRadius: 2,
    overflow: 'hidden',
    flexShrink: 0,
  },
  canvas: {
    display: 'block',
    cursor: 'crosshair',
    imageRendering: 'pixelated',
  },
};
