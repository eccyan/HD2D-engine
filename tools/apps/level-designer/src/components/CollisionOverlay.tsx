import React, { useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '../store/useEditorStore.js';

/**
 * Renders a collision grid overlay on top of the tile canvas.
 * Used for editing collision cells in GS scenes where tilemap collision
 * is replaced by an explicit collision grid.
 */
export const CollisionOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const collisionGrid = useEditorStore(s => s.collisionGrid);
  const viewportX = useEditorStore(s => s.viewportX);
  const viewportY = useEditorStore(s => s.viewportY);
  const zoom = useEditorStore(s => s.zoom);
  const activeLayer = useEditorStore(s => s.activeLayer);
  const toggleCollisionCell = useEditorStore(s => s.toggleCollisionCell);

  const isActive = activeLayer === 'collision' && collisionGrid !== null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !collisionGrid) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    if (!isActive) return;

    const cellPx = collisionGrid.cell_size * 16 * zoom; // 16px per tile unit

    ctx.save();
    ctx.translate(viewportX, viewportY);

    for (let y = 0; y < collisionGrid.height; y++) {
      for (let x = 0; x < collisionGrid.width; x++) {
        const px = x * cellPx;
        const py = y * cellPx;
        const solid = collisionGrid.solid[y * collisionGrid.width + x];

        if (solid) {
          ctx.fillStyle = 'rgba(255, 60, 60, 0.35)';
          ctx.fillRect(px, py, cellPx, cellPx);
        }

        // Grid lines
        ctx.strokeStyle = solid ? 'rgba(255, 60, 60, 0.5)' : 'rgba(100, 200, 100, 0.2)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, cellPx, cellPx);
      }
    }

    ctx.restore();
  }, [collisionGrid, viewportX, viewportY, zoom, isActive]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!collisionGrid || !isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left - viewportX;
    const my = e.clientY - rect.top - viewportY;
    const cellPx = collisionGrid.cell_size * 16 * zoom;
    const gx = Math.floor(mx / cellPx);
    const gy = Math.floor(my / cellPx);
    toggleCollisionCell(gx, gy);
  }, [collisionGrid, viewportX, viewportY, zoom, isActive, toggleCollisionCell]);

  if (!collisionGrid) return null;

  return (
    <canvas
      ref={canvasRef}
      width={1280}
      height={720}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: isActive ? 'auto' : 'none',
        cursor: isActive ? 'crosshair' : 'default',
      }}
      onClick={handleClick}
    />
  );
};
