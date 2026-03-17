import React, { useRef, useEffect, useCallback } from 'react';
import { useMapStore, type Layer } from '../store/useMapStore.js';

const LAYER_ORDER: Layer[] = ['ground', 'walls', 'decorations'];

export const PixelCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPainting = useRef(false);
  const lastCell = useRef<[number, number] | null>(null);

  const width = useMapStore(s => s.width);
  const height = useMapStore(s => s.height);
  const layers = useMapStore(s => s.layers);
  const heights = useMapStore(s => s.heights);
  const activeTool = useMapStore(s => s.activeTool);
  const activeColor = useMapStore(s => s.activeColor);
  const heightBrushValue = useMapStore(s => s.heightBrushValue);
  const zoom = useMapStore(s => s.zoom);
  const panX = useMapStore(s => s.panX);
  const panY = useMapStore(s => s.panY);
  const collisionGrid = useMapStore(s => s.collisionGrid);
  const showCollision = useMapStore(s => s.showCollision);

  const setPixel = useMapStore(s => s.setPixel);
  const erasePixel = useMapStore(s => s.erasePixel);
  const fillArea = useMapStore(s => s.fillArea);
  const setHeight = useMapStore(s => s.setHeight);
  const toggleCollision = useMapStore(s => s.toggleCollision);
  const setZoom = useMapStore(s => s.setZoom);
  const setPan = useMapStore(s => s.setPan);
  const pushUndo = useMapStore(s => s.pushUndo);

  // Render the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;

    ctx.fillStyle = '#111122';
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.translate(cw / 2 + panX, ch / 2 + panY);

    // Draw grid and pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const px = (x - width / 2) * zoom;
        const py = (y - height / 2) * zoom;

        // Checkerboard background
        ctx.fillStyle = (x + y) % 2 === 0 ? '#222233' : '#1a1a2e';
        ctx.fillRect(px, py, zoom, zoom);

        // Draw layers bottom-to-top
        for (const layer of LAYER_ORDER) {
          const data = layers[layer];
          const idx = (y * width + x) * 4;
          const a = data[idx + 3];
          if (a === 0) continue;
          ctx.fillStyle = `rgba(${data[idx]},${data[idx + 1]},${data[idx + 2]},${a / 255})`;
          ctx.fillRect(px, py, zoom, zoom);
        }

        // Height visualization (darker shade = taller)
        const h = heights[y * width + x];
        if (h > 0) {
          const shade = Math.min(0.6, h * 0.1);
          ctx.fillStyle = `rgba(0,0,0,${shade})`;
          ctx.fillRect(px, py, zoom, zoom);
          // Height number
          if (zoom >= 12) {
            ctx.fillStyle = '#fff';
            ctx.font = `${Math.max(8, zoom * 0.4)}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(h.toFixed(0), px + zoom / 2, py + zoom / 2);
          }
        }

        // Collision overlay
        if (showCollision && collisionGrid[y * width + x]) {
          ctx.fillStyle = 'rgba(255,0,0,0.3)';
          ctx.fillRect(px, py, zoom, zoom);
          ctx.strokeStyle = 'rgba(255,0,0,0.6)';
          ctx.strokeRect(px + 0.5, py + 0.5, zoom - 1, zoom - 1);
        }
      }
    }

    // Grid lines
    if (zoom >= 4) {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= width; x++) {
        const px = (x - width / 2) * zoom;
        ctx.beginPath();
        ctx.moveTo(px, -height / 2 * zoom);
        ctx.lineTo(px, height / 2 * zoom);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y++) {
        const py = (y - height / 2) * zoom;
        ctx.beginPath();
        ctx.moveTo(-width / 2 * zoom, py);
        ctx.lineTo(width / 2 * zoom, py);
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [width, height, layers, heights, zoom, panX, panY, collisionGrid, showCollision]);

  // Convert mouse position to grid cell
  const mouseToCell = useCallback((e: React.MouseEvent): [number, number] | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left - canvas.width / 2 - panX;
    const my = e.clientY - rect.top - canvas.height / 2 - panY;
    const x = Math.floor(mx / zoom + width / 2);
    const y = Math.floor(my / zoom + height / 2);
    if (x < 0 || x >= width || y < 0 || y >= height) return null;
    return [x, y];
  }, [width, height, zoom, panX, panY]);

  const applyTool = useCallback((x: number, y: number) => {
    const [r, g, b, a] = activeColor;
    switch (activeTool) {
      case 'pencil':
        setPixel(x, y, r, g, b, a);
        break;
      case 'eraser':
        erasePixel(x, y);
        break;
      case 'fill':
        fillArea(x, y, r, g, b, a);
        break;
      case 'height':
        setHeight(x, y, heightBrushValue);
        break;
      case 'select':
        toggleCollision(x, y);
        break;
    }
  }, [activeTool, activeColor, heightBrushValue, setPixel, erasePixel, fillArea, setHeight, toggleCollision]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) return; // Middle button for pan
    const cell = mouseToCell(e);
    if (!cell) return;
    isPainting.current = true;
    lastCell.current = cell;
    pushUndo();
    applyTool(cell[0], cell[1]);
  }, [mouseToCell, applyTool, pushUndo]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPainting.current) return;
    const cell = mouseToCell(e);
    if (!cell) return;
    if (lastCell.current && cell[0] === lastCell.current[0] && cell[1] === lastCell.current[1]) return;
    lastCell.current = cell;
    applyTool(cell[0], cell[1]);
  }, [mouseToCell, applyTool]);

  const onMouseUp = useCallback(() => {
    isPainting.current = false;
    lastCell.current = null;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(zoom + (e.deltaY < 0 ? 2 : -2));
    } else {
      setPan(panX - e.deltaX, panY - e.deltaY);
    }
  }, [zoom, panX, panY, setZoom, setPan]);

  return (
    <canvas
      ref={canvasRef}
      width={1024}
      height={768}
      style={{ cursor: 'crosshair', display: 'block', width: '100%', height: '100%' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
    />
  );
};
